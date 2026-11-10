import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  clearJobEvidence, emptySections, jobArguments, jobConcurrency, jobFailure, jobPassed, mergeJobReports, requestedJob, runJobs, writeMergedEvidence,
  type JobReport, type JobResult,
} from '../scripts/web-interaction-jobs.mjs';
import { WEB_INTERACTION_JOBS, WEB_INTERACTION_SECTIONS, webInteractionJobsToRun } from '../scripts/verifier-sections.mjs';

// The Web interaction run as jobs that run at the same time (scripts/web-interaction-jobs.mjs), exercised with a
// stand-in for the verifier script, so no browser opens.

function assertion(viewport: string, name: string): JobReport['assertions'][number] {
  return { viewport, name, passed: true };
}

function report(job: string, overrides: Partial<JobReport> = {}): JobReport {
  return {
    passed: true, url: `http://127.0.0.1/${job}`, executablePath: 'chrome', startedAt: `2026-11-08T00:00:0${job.length % 10}.000Z`,
    assertions: [assertion(job, `${job} first`), assertion(job, `${job} second`)], captures: [{ viewport: job, name: '01' }],
    console: [{ type: 'log', text: `${job} says hello` }], pageErrors: [], failedRequests: [], expectedDiagnostics: [], engineGaps: [],
    timing: {}, sectionChecks: { events: 2 }, ...overrides,
  };
}

/** The result of job number `index`: the run was asked for that many. */
function resultAt(results: readonly JobResult[], index: number): JobResult {
  const found = results[index];
  assert.ok(found, `the run has a result number ${index}`);
  return found;
}

function result(job: string, overrides: Partial<JobResult> = {}): JobResult {
  return { job, startedAt: 0, durationMs: 1000, code: 0, timedOut: false, interrupted: undefined, report: report(job), ...overrides };
}

test('the jobs cover every section, each section is a known one, and a run that asks for one section starts only the jobs that have it', () => {
  const covered = new Set(WEB_INTERACTION_JOBS.flatMap(job => [...job.sections]));
  assert.deepEqual([...covered].sort(), [...WEB_INTERACTION_SECTIONS].sort(), 'every section runs in some job, and no job names another');
  assert.deepEqual(webInteractionJobsToRun([]).map(job => job.name), ['landscape', 'portrait', 'retina-landscape', 'retina-portrait', 'pages', 'touch']);
  assert.deepEqual(webInteractionJobsToRun(['rotation']), [{ name: 'pages', sections: ['rotation'] }]);
  assert.deepEqual(webInteractionJobsToRun(['touch-selection']), [{ name: 'touch', sections: ['touch-selection'], exclusive: true }]);
  assert.deepEqual(webInteractionJobsToRun(['font-slices', 'navigator']).map(job => [job.name, job.sections]).slice(-1), [['pages', ['navigator', 'font-slices']]]);
  assert.throws(() => webInteractionJobsToRun(['positioning']), /Unknown section "positioning"/, 'a native-only name is a typo here');
  assert.deepEqual(webInteractionJobsToRun(['code-editor']).map(job => job.name), ['landscape', 'portrait', 'retina-landscape', 'retina-portrait', 'touch'], 'the viewports and the touch tablet');
});

test('the arguments: which job, how many at once, and what the jobs are given', () => {
  assert.equal(requestedJob(['--only=events', '--job=portrait']), 'portrait');
  assert.equal(requestedJob(['--only=events']), undefined);
  assert.equal(jobConcurrency([], 6), 6, 'all at once by default');
  assert.equal(jobConcurrency(['--serial'], 6), 1);
  assert.equal(jobConcurrency(['--jobs=3'], 6), 3);
  assert.equal(jobConcurrency([], 0), 1, 'never less than one');
  assert.throws(() => jobConcurrency(['--jobs=0'], 6), /whole number of at least 1/);
  assert.throws(() => jobConcurrency(['--jobs=two'], 6), /whole number of at least 1/);
  assert.throws(() => jobConcurrency(['--serial', '--jobs=2'], 6), /give one/);
  assert.deepEqual(jobArguments(['--only=events', '--serial', '--jobs=2', '--engine=stock', '--release']), ['--only=events', '--engine=stock', '--release'],
    'the jobs run on the engine and the sections of the run, and do not start jobs themselves');
});

/** A stand-in for the verifier script: records start and end, waits for the others at a barrier, writes the report its plan says, and exits. */
function fakeVerifier(directory: string, plan: Readonly<Record<string, { report?: Partial<JobReport> | null; code?: number; hang?: boolean }>>, barrier: number): string {
  const path = join(directory, 'fake-verifier.mjs');
  writeFileSync(path, `import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
const directory = ${JSON.stringify(directory)};
const plan = ${JSON.stringify(plan)};
const barrier = ${barrier};
const job = process.argv.find(argument => argument.startsWith('--job=')).slice('--job='.length);
const entry = plan[job] ?? {};
const events = directory + '/events';
appendFileSync(events, 'start ' + job + '\\n');
const started = () => (existsSync(events) ? readFileSync(events, 'utf8').split('\\n').filter(line => line.startsWith('start ')).length : 0);
const waitedFrom = Date.now();
while (started() < barrier && Date.now() - waitedFrom < 15000) await new Promise(resolve => setTimeout(resolve, 10));
console.log('hello from ' + job + '\\nsecond line');
if (entry.hang) setInterval(() => {}, 1000);
else {
  if (entry.report !== null) writeFileSync(directory + '/out/report-' + job + '.json', JSON.stringify({ passed: true, assertions: [], captures: [], console: [], ...entry.report }));
  appendFileSync(events, 'end ' + job + '\\n');
  process.exitCode = entry.code ?? 0;
}
`);
  return path;
}

async function runFake(
  plan: Parameters<typeof fakeVerifier>[1],
  { concurrency, barrier, names = ['landscape', 'portrait', 'pages'], exclusive = [], deadlineMs = 30_000, killAfterMs = 500 }: { concurrency: number; barrier: number; names?: string[]; exclusive?: string[]; deadlineMs?: number; killAfterMs?: number },
) {
  const directory = mkdtempSync(join(tmpdir(), 'web-jobs-'));
  const output = join(directory, 'out');
  await clearJobEvidence(output);
  const results = await runJobs({
    scriptPath: fakeVerifier(directory, plan, barrier), args: ['--only=events'], output, concurrency, killAfterMs, jobs: names.map(name => ({ name, deadlineMs, exclusive: exclusive.includes(name) })),
  });
  const events = existsSync(join(directory, 'events')) ? readFileSync(join(directory, 'events'), 'utf8').split('\n').filter(line => line !== '') : [];
  return { results, events, directory, output };
}

test('jobs run at the same time: none ends before every one has started, and the results come back in the order given', async () => {
  const { results, events } = await runFake({}, { concurrency: 3, barrier: 3 });
  assert.deepEqual(results.map(item => item.job), ['landscape', 'portrait', 'pages']);
  assert.ok(results.every(jobPassed));
  assert.deepEqual(events.slice(0, 3).sort(), ['start landscape', 'start pages', 'start portrait'], 'all three started before any ended');
});

test('--jobs=n limits how many run at once, and --serial runs one after another', async () => {
  const serial = await runFake({}, { concurrency: 1, barrier: 0 });
  assert.deepEqual(serial.events, ['start landscape', 'end landscape', 'start portrait', 'end portrait', 'start pages', 'end pages']);
  const two = await runFake({}, { concurrency: 2, barrier: 0 });
  const startsBeforeFirstEnd = two.events.slice(0, two.events.findIndex(line => line.startsWith('end ')));
  assert.ok(startsBeforeFirstEnd.length <= 2, `at most two jobs were running at once: ${two.events.join(', ')}`);
});

test('an exclusive job runs by itself after every other job has ended, and its result keeps its place in the order given', async () => {
  const { results, events } = await runFake({}, { concurrency: 3, barrier: 0, names: ['landscape', 'touch', 'portrait', 'pages'], exclusive: ['touch'] });
  assert.deepEqual(results.map(item => item.job), ['landscape', 'touch', 'portrait', 'pages']);
  assert.ok(results.every(jobPassed));
  assert.deepEqual(events.slice(-2), ['start touch', 'end touch'], 'the exclusive job is the last to start and ends the run');
  assert.equal(events.filter(line => line.startsWith('end ')).length, 4);
  assert.ok(events.slice(0, -2).every(line => !line.endsWith(' touch')), 'and nothing of it runs while the others do');
  const serial = await runFake({}, { concurrency: 1, barrier: 0, names: ['touch', 'landscape'], exclusive: ['touch'] });
  assert.deepEqual(serial.events, ['start landscape', 'end landscape', 'start touch', 'end touch'], 'with --serial too');
});

test('a job that fails fails the run, is named, and the other jobs run to their end and keep their reports', async () => {
  const { results, events, output } = await runFake({ portrait: { report: { passed: false, error: 'Error: portrait: Tab focuses the first button\n    at stack' }, code: 1 } }, { concurrency: 3, barrier: 3 });
  assert.deepEqual(results.map(jobPassed), [true, false, true]);
  assert.equal(jobFailure(resultAt(results, 1)), 'portrait exited with code 1: Error: portrait: Tab focuses the first button');
  assert.equal(events.filter(line => line.startsWith('end ')).length, 3, 'the others ran to their end');
  assert.deepEqual(readdirSync(output).sort(), ['report-landscape.json', 'report-pages.json', 'report-portrait.json']);
});

test('a job that wrote no report, or whose report does not say it passed, did not pass, whatever its exit code was', async () => {
  const { results } = await runFake({ landscape: { report: null }, portrait: { report: { passed: false } }, pages: { code: 3 } }, { concurrency: 3, barrier: 0 });
  assert.deepEqual(results.map(jobPassed), [false, false, false]);
  assert.match(jobFailure(resultAt(results, 0)), /^landscape did not report a pass: no report: /);
  assert.equal(jobFailure(resultAt(results, 1)), 'portrait did not report a pass');
  assert.equal(jobFailure(resultAt(results, 2)), 'pages exited with code 3');
});

test('a job that hangs is killed past its deadline, the others are not held back by it, and it fails the run by name', async () => {
  const started = Date.now();
  const { results, events } = await runFake({ portrait: { hang: true } }, { concurrency: 3, barrier: 0, deadlineMs: 600, killAfterMs: 400 });
  assert.ok(Date.now() - started < 10_000);
  assert.deepEqual(results.map(jobPassed), [true, false, true], 'the others passed');
  assert.equal(resultAt(results, 1).timedOut, true);
  assert.match(jobFailure(resultAt(results, 1)), /^portrait was killed past its deadline/);
  assert.equal(events.filter(line => line.startsWith('end ')).length, 2);
});

test('the report of the run is the reports of the jobs: arrays in job order, counters summed, per-viewport facts kept under their names', () => {
  const merged = mergeJobReports([
    result('landscape', { report: report('landscape', { sectionChecks: { events: 3, scroll: 2 }, timing: { landscape: { cheap: 1 } }, platformFacts: { landscape: { a: 1 } }, engineGaps: ['gap one'], measures: [{ name: 'm1' }] }) }),
    result('portrait', { report: report('portrait', { sectionChecks: { events: 4, drag: 1 }, timing: { portrait: { cheap: 2 } }, platformFacts: { portrait: { a: 2 } }, horizontalWheel: { domDeltaX: 100 } }) }),
    result('touch', { report: report('touch', { sectionChecks: { touch: 5 }, platformFacts: { touch: { a: 3 } }, engineGaps: ['gap two'], measures: [{ name: 'm2' }] }) }),
  ]);
  assert.deepEqual(merged.assertions.map(item => item.name), ['landscape first', 'landscape second', 'portrait first', 'portrait second', 'touch first', 'touch second']);
  assert.deepEqual(merged.sectionChecks, { events: 7, scroll: 2, drag: 1, touch: 5 }, 'summed, in the order the sections first appear');
  assert.deepEqual(Object.keys(merged.timing), ['landscape', 'portrait']);
  assert.deepEqual(Object.keys(merged.platformFacts as object), ['landscape', 'portrait', 'touch']);
  assert.deepEqual(merged.engineGaps, ['gap one', 'gap two']);
  assert.deepEqual(merged.measures, [{ name: 'm1' }, { name: 'm2' }]);
  assert.deepEqual(merged.horizontalWheel, { domDeltaX: 100 });
  assert.deepEqual(merged.console.map(item => item.text), ['landscape says hello', 'portrait says hello', 'touch says hello']);
  assert.deepEqual(merged.jobs.portrait, { passed: true, durationMs: 1000, assertions: 2, captures: 1 });
  assert.equal(merged.captures.length, 3);
});

test('a job with no report is in the jobs and not in the arrays, and a failed job keeps its error in the merged report', () => {
  const merged = mergeJobReports([
    result('landscape'),
    result('portrait', { code: 1, report: report('portrait', { passed: false, error: 'Error: boom\n at x' }) }),
    result('pages', { code: null, timedOut: true, report: undefined, missing: 'ENOENT' }),
  ]);
  assert.deepEqual(Object.keys(merged.jobs), ['landscape', 'portrait', 'pages']);
  assert.deepEqual(merged.jobs.pages, { passed: false, durationMs: 1000, assertions: 0, captures: 0 });
  assert.equal(merged.assertions.length, 4);
  assert.deepEqual(merged.errors, { 'portrait.error': 'Error: boom\n at x' });
});

test('a section that made no assertion in any job is empty: a section that made none verified nothing', () => {
  assert.deepEqual(emptySections(['events', 'scroll', 'drag'], { events: 7, scroll: 0 }), ['scroll', 'drag']);
  assert.deepEqual(emptySections(['events'], { events: 1 }), []);
  const summed = mergeJobReports([result('landscape', { report: report('landscape', { sectionChecks: { events: 0, scroll: 2 } }) }), result('portrait', { report: report('portrait', { sectionChecks: { events: 0 } }) })]);
  assert.deepEqual(emptySections(['events', 'scroll'], summed.sectionChecks), ['events'], 'zero in every job stays zero');
  const split = mergeJobReports([result('landscape', { report: report('landscape', { sectionChecks: { events: 0 } }) }), result('portrait', { report: report('portrait', { sectionChecks: { events: 2 } }) })]);
  assert.deepEqual(emptySections(['events'], split.sectionChecks), [], 'a section that asserted in one viewport ran');
});

test('the merged evidence is report.json and browser.log, and stale per-job files are cleared first', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'web-jobs-evidence-'));
  writeFileSync(join(directory, 'report.json'), 'old');
  writeFileSync(join(directory, 'report-portrait.json'), 'old');
  writeFileSync(join(directory, 'browser-retina-portrait.log'), 'old');
  writeFileSync(join(directory, '01-keep.png'), 'a capture');
  await clearJobEvidence(directory);
  assert.deepEqual(readdirSync(directory), ['01-keep.png']);
  const results = [result('landscape'), result('portrait')];
  const merged = mergeJobReports(results);
  merged.passed = true;
  await writeMergedEvidence(directory, merged, results);
  const written = JSON.parse(readFileSync(join(directory, 'report.json'), 'utf8')) as { passed: boolean; finishedAt: string; assertions: unknown[] };
  assert.equal(written.passed, true);
  assert.equal(written.assertions.length, 4);
  assert.ok(typeof written.finishedAt === 'string');
  assert.equal(readFileSync(join(directory, 'browser.log'), 'utf8'), '[log] landscape says hello\n[log] portrait says hello\n');
});
