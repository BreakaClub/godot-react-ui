import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { rejectUnknownArguments } from '../scripts/arguments.mjs';

// An unknown command-line argument is an error in every script that has a fixed set of options (scripts/arguments.mjs), and the
// error comes before the script does anything else: a mistyped flag must not silently run the default.

const scripts = resolve(__dirname, '..', 'scripts');
const BOGUS = '--definitely-not-a-flag';

test('the helper takes the listed flags, the listed prefixes and the engine selector, and nothing else', () => {
  const accepted = { flags: ['--release', '--probe'], prefixes: ['--only='] };
  rejectUnknownArguments(['--release', '--only=events,forms', '--engine=stock', '--probe'], accepted);
  rejectUnknownArguments([], accepted);
  assert.throws(() => rejectUnknownArguments(['--release', '--relase'], accepted), /Unknown argument: --relase \(this script takes --release, --probe, --only=…, --engine=<name>\)/);
  assert.throws(() => rejectUnknownArguments(['--only'], accepted), /Unknown argument: --only/, 'a prefix needs its `=`');
  assert.throws(() => rejectUnknownArguments(['extra'], {}), /Unknown argument: extra/);
});

/** Every script that takes options. `scripts/run.mjs` is not one: it hands its arguments to Godot, which decides what it takes. */
const SCRIPTS_WITH_OPTIONS = [
  'build', 'build-live-compile', 'build-live-compile-web', 'build-native', 'build-web', 'deploy-web', 'dev', 'generate-types', 'live-compile-agreement', 'live-compile-project', 'navigator-captures', 'probe-web', 'serve-web', 'test-types', 'verify', 'verify-a11y',
  'verify-interaction-web', 'verify-live-compile-web', 'verify-motion-web', 'verify-text-layout', 'verify-web', 'verify-world', 'verify-world-web',
];

/** Scripts run with tsx, which loads the TypeScript modules they import. */
const TSX_SCRIPTS = ['glass-reference', 'transform-reference', 'text-styles-reference', 'tailwind-coverage', 'layout-utilities-reference', 'paint-reference'];

for (const script of [...SCRIPTS_WITH_OPTIONS, ...TSX_SCRIPTS]) {
  test(`scripts/${script}.mjs refuses an argument it does not take, before it does anything`, () => {
    const nodeArguments = TSX_SCRIPTS.includes(script) ? ['--import', 'tsx'] : [];
    const result = spawnSync('node', [...nodeArguments, resolve(scripts, `${script}.mjs`), BOGUS], { encoding: 'utf8', timeout: 30_000, cwd: resolve(scripts, '..') });
    assert.notEqual(result.status, 0, `${script} ran with ${BOGUS}`);
    assert.match(result.stderr, new RegExp(`Unknown argument:? ${BOGUS}`));
    assert.equal(result.stdout, '', 'nothing was done or printed before the refusal');
  });
}

test('scripts/build-native.mjs refuses --probe together with --faults: they are separate feature sets with separate stamps', () => {
  const result = spawnSync('node', [resolve(scripts, 'build-native.mjs'), '--probe', '--faults'], { encoding: 'utf8', timeout: 30_000 });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--probe and --faults are separate builds/);
  assert.doesNotMatch(result.stdout, /Compiling|target/, 'cargo was not started');
});

test('every script that reads process.argv is checked above, so a new one cannot skip the rule', () => {
  // engine.mjs is a library: it reads process.argv for the default of a function whose callers pass their own.
  const reading = readdirSync(scripts)
    .filter((name) => name.endsWith('.mjs') && name !== 'engine.mjs')
    .filter((name) => /process\.argv/.test(readFileSync(resolve(scripts, name), 'utf8')))
    .map((name) => name.replace(/\.mjs$/, ''));
  // run and quiet-window hand their arguments to Godot or an underlying command.
  const exempt = ['run', 'quiet-window'];
  const unchecked = reading.filter((name) => !SCRIPTS_WITH_OPTIONS.includes(name) && !TSX_SCRIPTS.includes(name) && !exempt.includes(name));
  assert.deepEqual(unchecked, [], 'these scripts read process.argv and are not checked by this test');
});
