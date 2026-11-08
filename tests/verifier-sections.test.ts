import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  INTERACTION_MINIMUM_DEADLINE_MS, INTERACTION_SECTION_ALLOWANCE_MS, INTERACTION_START_ALLOWANCE_MS, NATIVE_INTERACTION_SECTIONS,
  NATIVE_OPT_IN_SECTIONS, ONLY_PREFIX, WEB_INTERACTION_JOBS, WEB_INTERACTION_JOB_MINIMUM_DEADLINE_MS, WEB_INTERACTION_JOB_SECTION_ALLOWANCE_MS,
  WEB_INTERACTION_JOB_START_ALLOWANCE_MS, WEB_INTERACTION_SECTIONS, checkSectionNames, describeSections, interactionDeadlineMs, requestedSections,
  sectionsToRun, webInteractionJobDeadlineMs,
} from '../scripts/verifier-sections.mjs';

// Which sections an interaction verifier runs and when a run is partial (plan 0.4.1; scripts/verifier-sections.mjs).

const root = resolve(__dirname, '..');
const DEFAULT_SECTIONS = NATIVE_INTERACTION_SECTIONS.filter((name) => !NATIVE_OPT_IN_SECTIONS.some((optIn) => optIn === name));

test('a plain native run runs every default section, leaves out nothing and is not partial', () => {
  const coverage = describeSections(NATIVE_INTERACTION_SECTIONS, NATIVE_OPT_IN_SECTIONS, []);
  assert.deepEqual(coverage.run, DEFAULT_SECTIONS);
  assert.deepEqual(coverage.skipped, [], 'the opt-in sections were not asked for, so they were not left out');
  assert.equal(coverage.partial, false);
});

test('a run that names some sections is partial and lists the default sections it left out, never the opt-in ones', () => {
  const coverage = describeSections(NATIVE_INTERACTION_SECTIONS, NATIVE_OPT_IN_SECTIONS, ['selection', 'forms']);
  assert.deepEqual(coverage.run, ['selection', 'forms']);
  assert.equal(coverage.partial, true);
  assert.deepEqual(coverage.skipped, DEFAULT_SECTIONS.filter((name) => name !== 'selection' && name !== 'forms'));
  for (const optIn of NATIVE_OPT_IN_SECTIONS) assert.ok(!coverage.skipped.includes(optIn), `${optIn} is not reported as left out`);
});

test('an opt-in section runs only when it is named, and then the default sections are what the run left out', () => {
  const coverage = describeSections(NATIVE_INTERACTION_SECTIONS, NATIVE_OPT_IN_SECTIONS, ['filters-sizes']);
  assert.deepEqual(coverage.run, ['filters-sizes']);
  assert.deepEqual(coverage.skipped, DEFAULT_SECTIONS);
  assert.equal(coverage.partial, true);
});

test('naming every default section is the same run as naming none', () => {
  const coverage = describeSections(NATIVE_INTERACTION_SECTIONS, NATIVE_OPT_IN_SECTIONS, [...DEFAULT_SECTIONS].reverse());
  assert.deepEqual(coverage.run, DEFAULT_SECTIONS, 'sections run in the verifier\'s order whatever order they are named in');
  assert.equal(coverage.partial, false);
});

test('the Web verifier has no opt-in sections: a plain run runs all of them and a named run leaves the rest out', () => {
  assert.equal(describeSections(WEB_INTERACTION_SECTIONS, [], []).partial, false);
  assert.deepEqual(describeSections(WEB_INTERACTION_SECTIONS, [], []).run, WEB_INTERACTION_SECTIONS);
  const named = describeSections(WEB_INTERACTION_SECTIONS, [], ['touch']);
  assert.deepEqual(named.skipped, WEB_INTERACTION_SECTIONS.filter((name) => name !== 'touch'));
});

test('--only= arguments are read from all of the arguments and split on commas', () => {
  assert.deepEqual(requestedSections(['--interaction', `${ONLY_PREFIX}events,pointers`, '--no-retry', `${ONLY_PREFIX}forms`]), ['events', 'pointers', 'forms']);
  assert.deepEqual(requestedSections(['--interaction']), []);
});

test('the font-fallback section runs first: a face keeps what the library added for characters no font has, so nothing that shows such text may come before it', () => {
  assert.equal(NATIVE_INTERACTION_SECTIONS[0], 'font-fallback');
  assert.ok(!(WEB_INTERACTION_SECTIONS as readonly string[]).includes('font-fallback'), 'the Web has its own section, font-slices');
});

test('an unknown section name is an error, however it got there', () => {
  assert.throws(() => checkSectionNames(['events', 'evnts'], NATIVE_INTERACTION_SECTIONS), /Unknown section "evnts"; the sections are font-fallback, events, /);
  assert.throws(() => sectionsToRun(NATIVE_INTERACTION_SECTIONS, NATIVE_OPT_IN_SECTIONS, ['touch']), /Unknown section "touch"/, 'touch is the Web verifier\'s');
  assert.throws(() => describeSections(WEB_INTERACTION_SECTIONS, [], ['positioning']), /Unknown section "positioning"/, 'positioning is native only');
  assert.throws(() => sectionsToRun(NATIVE_INTERACTION_SECTIONS, NATIVE_OPT_IN_SECTIONS, ['']), /Unknown section ""/, '--only= with no name is a typo too');
});

test('scripts/verify.mjs refuses an unknown --only= name before it builds or launches anything', () => {
  const result = spawnSync('node', ['scripts/verify.mjs', '--interaction', '--only=selection,evnts'], { cwd: root, encoding: 'utf8', timeout: 30_000 });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown section "evnts"/);
  assert.doesNotMatch(result.stdout + result.stderr, /Engine profile|pnpm build|PASSED/, 'nothing ran before the refusal');
});

test('every section in a list has a branch in the verifier that runs it', () => {
  const native = readFileSync(resolve(root, 'demo/src/verify-interaction.ts'), 'utf8');
  for (const name of NATIVE_INTERACTION_SECTIONS) assert.ok(native.includes(`sections.has('${name}')`), `demo/src/verify-interaction.ts does not run "${name}"`);
  const web = readFileSync(resolve(root, 'scripts/verify-interaction-web.mjs'), 'utf8');
  for (const name of WEB_INTERACTION_SECTIONS) assert.ok(web.includes(`wanted('${name}')`), `scripts/verify-interaction-web.mjs does not run "${name}"`);
});

test('both verifiers take their sections from the shared module and keep no list of their own', () => {
  const native = readFileSync(resolve(root, 'demo/src/verify-interaction.ts'), 'utf8');
  const web = readFileSync(resolve(root, 'scripts/verify-interaction-web.mjs'), 'utf8');
  assert.match(native, /scripts\/verifier-sections\.mjs/);
  assert.match(web, /\.\/verifier-sections\.mjs/);
  assert.doesNotMatch(native, /const SECTIONS = \[/);
  assert.doesNotMatch(web, /const SECTIONS = \[/);
});

// A landscape window's 24 default sections took 594 s one after the other and 534 s alongside the portrait window (scripts/verifier-sections.mjs has the measurements).
const MEASURED_SERIAL_WINDOW_MS = 594_000;
const SLOWEST_SECTION_MS = 89_000;

test('the native interaction deadline grows with the sections a window runs, and never falls below its floor', () => {
  assert.equal(interactionDeadlineMs(1), INTERACTION_MINIMUM_DEADLINE_MS, 'one section keeps the floor');
  assert.ok(interactionDeadlineMs(1) > SLOWEST_SECTION_MS * 2, 'the slowest section alone fits twice over');
  const full = interactionDeadlineMs(DEFAULT_SECTIONS.length);
  assert.equal(full, INTERACTION_START_ALLOWANCE_MS + INTERACTION_SECTION_ALLOWANCE_MS * DEFAULT_SECTIONS.length);
  assert.ok(full > MEASURED_SERIAL_WINDOW_MS * 1.5, `the default run (${full} ms) has at least half again the slowest measured window`);
  assert.ok(interactionDeadlineMs(DEFAULT_SECTIONS.length + 1) > full, 'one more section raises it');
});

// The slowest Web job measured, with the six jobs running at the same time: a viewport job's 18 sections took up to 398 s; the pages job's three took 162 s; the touch job's six
// about 90 s (scripts/verifier-sections.mjs has the measurements).
const MEASURED_VIEWPORT_JOB_MS = 398_000;
const MEASURED_PAGES_JOB_MS = 162_000;
const MEASURED_TOUCH_JOB_MS = 90_000;

test('the Web job deadline grows with the sections a job executes, and never falls below its floor', () => {
  assert.equal(webInteractionJobDeadlineMs(1), WEB_INTERACTION_JOB_MINIMUM_DEADLINE_MS, 'one section keeps the floor');
  for (const job of WEB_INTERACTION_JOBS) {
    assert.equal(webInteractionJobDeadlineMs(job.sections.length), Math.max(WEB_INTERACTION_JOB_MINIMUM_DEADLINE_MS,
      WEB_INTERACTION_JOB_START_ALLOWANCE_MS + WEB_INTERACTION_JOB_SECTION_ALLOWANCE_MS * job.sections.length));
  }
  assert.ok(webInteractionJobDeadlineMs(WEB_INTERACTION_SECTIONS.length + 1) > webInteractionJobDeadlineMs(WEB_INTERACTION_SECTIONS.length), 'one more section raises it');
});

test('every Web job has at least half again its measured time, and the floor covers a job of few sections', () => {
  const byName = new Map(WEB_INTERACTION_JOBS.map((job) => [job.name, job.sections.length]));
  const deadline = (name: string): number => webInteractionJobDeadlineMs(byName.get(name) ?? 0);
  for (const viewport of ['landscape', 'portrait', 'retina-landscape', 'retina-portrait']) {
    assert.ok(deadline(viewport) > MEASURED_VIEWPORT_JOB_MS * 1.5, `${viewport}: ${deadline(viewport)} ms against ${MEASURED_VIEWPORT_JOB_MS} ms measured`);
  }
  assert.ok(deadline('pages') > MEASURED_PAGES_JOB_MS * 1.5, `pages: ${deadline('pages')} ms against ${MEASURED_PAGES_JOB_MS} ms measured`);
  assert.ok(deadline('touch') > MEASURED_TOUCH_JOB_MS * 1.5, `touch: ${deadline('touch')} ms against ${MEASURED_TOUCH_JOB_MS} ms measured`);
});
