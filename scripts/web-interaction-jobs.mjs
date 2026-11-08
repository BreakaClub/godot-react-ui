import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runSupervised } from './supervised-process.mjs';

// The Web interaction run as several jobs at the same time (docs/tracks/suite-speed.md). Each job is this script run again with `--job=<name>`:
// a Node process of its own with its own Chrome, its own page(s), its own export server and its own clipboard, focus, counters and captures, so
// nothing the verifier keeps in module state (`activeViewport`, the section counters, the report) can be seen by another job. The jobs write
// `report-<job>.json` beside the evidence; the run that started them reads those and reports them as one run (`mergeJobReports`).

/** The argument that makes the verifier run one job and nothing else. */
export const JOB_ARGUMENT = '--job=';
/** The argument that limits how many jobs run at the same time. */
export const JOBS_ARGUMENT = '--jobs=';
/** Runs one job after another: the way the whole run was made before. */
export const SERIAL_FLAG = '--serial';

/**
 * End this process once what it printed has reached its pipes, with the exit code that was set. A job ends when its evidence is written: Chrome leaves
 * helper processes behind it (a crash handler that outlives the browser) that can hold the pipes it was started with, and a process waiting for them
 * would hold the run that started it.
 */
export async function exitAfterFlush() {
  await Promise.all([process.stdout, process.stderr].map(stream => new Promise(flushed => stream.write('', flushed))));
  process.exit();
}

export function jobReportName(job) {
  return `report-${job}.json`;
}

export function jobLogName(job) {
  return `browser-${job}.log`;
}

/** The job named by `--job=<name>`, or `undefined` for the run that starts the jobs. */
export function requestedJob(argv) {
  const argument = argv.find(candidate => candidate.startsWith(JOB_ARGUMENT));
  return argument === undefined ? undefined : argument.slice(JOB_ARGUMENT.length);
}

/**
 * How many jobs run at the same time: `--serial` is one, `--jobs=<n>` is n, and by default all of them. A bad number is an error, and so is
 * asking for both.
 */
export function jobConcurrency(argv, jobCount) {
  const limit = argv.find(candidate => candidate.startsWith(JOBS_ARGUMENT));
  const serial = argv.includes(SERIAL_FLAG);
  if (serial && limit !== undefined) throw new Error(`${SERIAL_FLAG} and ${JOBS_ARGUMENT}<n> both say how many jobs run at once; give one`);
  if (serial) return 1;
  if (limit === undefined) return Math.max(1, jobCount);
  const count = Number(limit.slice(JOBS_ARGUMENT.length));
  if (!Number.isInteger(count) || count < 1) throw new Error(`${limit}: the number of jobs to run at once is a whole number of at least 1`);
  return count;
}

/** The arguments the jobs are given: the run's own, less what only the run that starts them reads. */
export function jobArguments(argv) {
  return argv.filter(argument => argument !== SERIAL_FLAG && !argument.startsWith(JOBS_ARGUMENT) && !argument.startsWith(JOB_ARGUMENT));
}

/** Remove the reports and logs an earlier run left, so nothing old reads as this run's. */
export async function clearJobEvidence(output) {
  await mkdir(output, { recursive: true });
  for (const entry of await readdir(output)) {
    if (/^(?:report|browser)(?:-[a-z-]+)?\.(?:json|log)$/u.test(entry)) await rm(resolve(output, entry), { force: true });
  }
}

async function readJobReport(output, job) {
  try {
    return { report: JSON.parse(await readFile(resolve(output, jobReportName(job)), 'utf8')) };
  } catch (error) {
    return { missing: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Run `jobs` (`[{ name, deadlineMs }]`), at most `concurrency` at a time, each as `node scriptPath ...args --job=<name>` with its output labelled
 * `[name] `. Every job runs to its end whatever the others do, so a run that fails in one viewport still says how the others did. Resolves with one
 * entry for each job, in the order given: `{ job, startedAt, durationMs, code, timedOut, interrupted, report?, missing? }`, where `report` is what
 * the job wrote and `missing` says why it wrote none.
 *
 * Each job's deadline is its own hang guard; this kills a job `killAfterMs` past it, when the job's own has not ended it.
 */
export async function runJobs({ scriptPath, args, jobs, output, concurrency, env = process.env, killAfterMs = 60_000, nodePath = process.execPath }) {
  const results = new Array(jobs.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= jobs.length) return;
      const job = jobs[index];
      const started = Date.now();
      const supervised = await runSupervised({
        command: nodePath, args: [scriptPath, ...args, `${JOB_ARGUMENT}${job.name}`], env, deadlineMs: job.deadlineMs + killAfterMs, outputPrefix: `[${job.name}] `,
      });
      const durationMs = Date.now() - started;
      const written = await readJobReport(output, job.name);
      results[index] = {
        job: job.name, startedAt: started, durationMs, code: supervised.code, timedOut: supervised.timedOut, interrupted: supervised.interrupted, ...written,
      };
      if (!jobPassed(results[index])) console.error(`${job.name} failed; the other job(s) run to their end, and the run reports every job`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  return results;
}

/** Whether a job's process ended well and its report says it passed. */
export function jobPassed(result) {
  return result.code === 0 && !result.timedOut && result.interrupted === undefined && result.report?.passed === true;
}

/** Why a job did not pass, in a sentence that names it. */
export function jobFailure(result) {
  const how = result.timedOut ? `was killed past its deadline` : result.interrupted !== undefined ? `was interrupted by ${result.interrupted}`
    : result.code !== 0 ? `exited with ${result.code === null ? 'a signal' : `code ${result.code}`}` : 'did not report a pass';
  const detail = result.report?.error ?? (result.missing === undefined ? undefined : `no report: ${result.missing}`);
  return `${result.job} ${how}${detail === undefined ? '' : `: ${String(detail).split('\n')[0]}`}`;
}

/** Sum the per-section counts of several jobs, in the order the sections first appear. */
function sumCounts(all) {
  const total = {};
  for (const counts of all) for (const [name, count] of Object.entries(counts ?? {})) total[name] = (total[name] ?? 0) + count;
  return total;
}

/**
 * The reports of the jobs as the report of one run, which is what the run that did them all in one browser wrote. The arrays follow the order of
 * the jobs given (the viewports in turn, then the pages of their own, then the touch pages: the order the run made them in), the counters are
 * summed, and what a scenario sets under a viewport's own name stays under it. Per-job facts that have no place in the single run's report are
 * under `jobs`.
 */
export function mergeJobReports(results) {
  const reports = results.flatMap(result => result.report === undefined ? [] : [{ job: result.job, report: result.report }]);
  const merged = {
    urls: Object.fromEntries(reports.map(({ job, report }) => [job, report.url])),
    executablePath: reports[0]?.report.executablePath,
    startedAt: reports.map(({ report }) => report.startedAt).sort()[0],
    assertions: [], captures: [], console: [], pageErrors: [], failedRequests: [], expectedDiagnostics: [], engineGaps: [],
    timing: {}, platformFacts: {}, sectionChecks: sumCounts(reports.map(({ report }) => report.sectionChecks)),
    jobs: Object.fromEntries(results.map(result => [result.job, {
      passed: jobPassed(result), durationMs: result.durationMs, assertions: result.report?.assertions.length ?? 0, captures: result.report?.captures.length ?? 0,
      ...result.report?.sectionMs === undefined ? {} : { sectionMs: result.report.sectionMs },
    }])),
    passed: false,
  };
  for (const { report } of reports) {
    for (const field of ['assertions', 'captures', 'console', 'pageErrors', 'failedRequests', 'expectedDiagnostics', 'engineGaps']) merged[field].push(...(report[field] ?? []));
    if (report.measures !== undefined) (merged.measures ??= []).push(...report.measures);
    Object.assign(merged.timing, report.timing);
    Object.assign(merged.platformFacts, report.platformFacts);
    if (report.horizontalWheel !== undefined) merged.horizontalWheel ??= report.horizontalWheel;
  }
  const errors = Object.fromEntries(reports.flatMap(({ job, report }) => ['error', 'failureCaptureError', 'browserCleanupError'].flatMap(field => report[field] === undefined ? [] : [[`${job}.${field}`, report[field]]])));
  if (Object.keys(errors).length > 0) merged.errors = errors;
  return merged;
}

/** The sections that ran and asserted nothing, over every job: a section that made none verified nothing. */
export function emptySections(wantedSections, sectionChecks) {
  return wantedSections.filter(name => !(sectionChecks[name] > 0));
}

/** Write what a run leaves beside its captures: the merged `report.json`, and `browser.log` (every job's console, labelled with its job). */
export async function writeMergedEvidence(output, merged, results) {
  merged.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(merged, null, 2) + '\n');
  const lines = results.flatMap(result => (result.report?.console ?? []).map(entry => `[${entry.type}] ${entry.text}`));
  await writeFile(resolve(output, 'browser.log'), lines.join('\n') + '\n');
}
