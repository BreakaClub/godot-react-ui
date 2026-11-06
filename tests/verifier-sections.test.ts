import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  NATIVE_INTERACTION_SECTIONS, NATIVE_OPT_IN_SECTIONS, ONLY_PREFIX, WEB_INTERACTION_SECTIONS, checkSectionNames, describeSections, requestedSections,
  sectionsToRun,
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

test('an unknown section name is an error, however it got there', () => {
  assert.throws(() => checkSectionNames(['events', 'evnts'], NATIVE_INTERACTION_SECTIONS), /Unknown section "evnts"; the sections are events, /);
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
