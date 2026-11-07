import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { demoArguments } from '../scripts/demo-arguments.mjs';
import { demoStart } from '../demo/src/launch';
import { LAB_GROUPS, LABS, filterLabs, findLab, labElement, labsInOrder, type LabName } from '../demo/src/labs';

// The lab registry (demo/src/labs.tsx) and the decision of what a run opens with (demo/src/launch.ts).

const root = resolve(__dirname, '..');
const DEMO_ROOT_PREFIX = 'res://';
/** The longest description that stays one line under the title at the narrowest window the navigator is checked at. */
const DESCRIPTION_LIMIT = 150;

test('every lab has a unique lowercase id, a title, a one-sentence description and a known group', () => {
  const ids = LABS.map((lab) => lab.id);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  for (const lab of LABS) {
    assert.match(lab.id, /^[a-z]+(-[a-z]+)*$/u, `${lab.id} is words joined by hyphens`);
    assert.ok(lab.title.trim() !== '', `${lab.id} has a title`);
    assert.ok(lab.description.endsWith('.'), `${lab.id}'s description is a sentence`);
    assert.ok(lab.description.length <= DESCRIPTION_LIMIT, `${lab.id}'s description is ${lab.description.length} characters`);
    assert.ok(LAB_GROUPS.includes(lab.group), `${lab.id} is in the group ${lab.group}`);
  }
});

test('every group has a lab, so the sidebar has no empty heading', () => {
  for (const group of LAB_GROUPS) assert.ok(LABS.some((lab) => lab.group === group), `${group} has no lab`);
});

test('every lab names source files that exist in the demo project, and the scene a lab opens exists', () => {
  for (const lab of LABS) {
    assert.ok(lab.sources.length > 0, `${lab.id} names no source`);
    for (const source of lab.sources) {
      assert.ok(source.startsWith(DEMO_ROOT_PREFIX), `${source} is a resource path`);
      assert.ok(existsSync(resolve(root, 'demo', source.slice(DEMO_ROOT_PREFIX.length))), `${lab.id}: ${source} does not exist`);
    }
    if (lab.kind === 'scene') assert.ok(existsSync(resolve(root, 'demo', lab.scene.slice(DEMO_ROOT_PREFIX.length))), `${lab.id}: ${lab.scene} does not exist`);
  }
});

test('the labs the verifiers have always rendered by name are still there', () => {
  const names: readonly LabName[] = ['hud', 'pointers', 'keyboard', 'positioning', 'inputs', 'scroll', 'selection', 'drag', 'forms', 'forms-extra', 'hidpi', 'glass'];
  for (const name of names) {
    const lab = findLab(name);
    assert.ok(lab !== undefined && lab.kind !== 'scene', `${name} is a page`);
    assert.equal(labElement(name).type, lab.component, `${name} renders its own component`);
  }
});

test('a scene is not a page: showLab has no name for it', () => {
  // `LabName` leaves scenes out at compile time; this is the same fact at run time.
  assert.throws(() => labElement('world' as LabName), /There is no lab page named world/);
});

test('labs are listed by group in the sidebar\'s order, and the array\'s order holds inside a group', () => {
  const ordered = labsInOrder(LABS);
  assert.equal(ordered.length, LABS.length);
  const groups = ordered.map((lab) => LAB_GROUPS.indexOf(lab.group));
  assert.deepEqual(groups, [...groups].sort((a, b) => a - b));
  for (const group of LAB_GROUPS) {
    assert.deepEqual(ordered.filter((lab) => lab.group === group), LABS.filter((lab) => lab.group === group));
  }
});

test('the filter matches every word in any of the title, description, group and id, in any case', () => {
  assert.equal(filterLabs(LABS, ''), LABS);
  assert.equal(filterLabs(LABS, '   '), LABS);
  assert.deepEqual(filterLabs(LABS, 'GLASS').map((lab) => lab.id), ['glass']);
  const effects = filterLabs(LABS, 'effects').map((lab) => lab.id);
  assert.ok(effects.includes('filters') && effects.includes('glass'), 'the group name matches');
  assert.ok(effects.includes('drag'), 'so does a description that says "drop effects"');
  assert.deepEqual(filterLabs(LABS, 'effects blur').map((lab) => lab.id), ['filters', 'glass'], 'every word must match, in any one of the fields');
  assert.deepEqual(filterLabs(LABS, 'forms-extra').map((lab) => lab.id), ['forms-extra']);
  assert.deepEqual(filterLabs(LABS, 'text selection').map((lab) => lab.id), ['selection']);
  assert.deepEqual(filterLabs(LABS, 'zzzz'), []);
});

test('the registry is the only place a lab is listed: no other source names the ids twice', () => {
  const source = readFileSync(resolve(root, 'demo/src/labs.tsx'), 'utf8');
  for (const lab of LABS) assert.equal(source.split(`id: '${lab.id}'`).length - 1, 1, `${lab.id} is entered once`);
});

test('a normal run opens the navigator; a verifier or the probe opens the playground it was written against', () => {
  assert.deepEqual(demoStart([], false), { kind: 'navigator', lab: undefined });
  assert.deepEqual(demoStart([], true), { kind: 'app' });
  assert.deepEqual(demoStart(['--verify-interaction', '--only=navigator'], true), { kind: 'app' });
});

test('--lab= opens the navigator on that lab, even for a run that injects input; --demo= chooses outright', () => {
  assert.deepEqual(demoStart(['--lab=glass'], false), { kind: 'navigator', lab: 'glass' });
  assert.deepEqual(demoStart(['--verify-interaction', '--lab=glass'], true), { kind: 'navigator', lab: 'glass' });
  assert.deepEqual(demoStart(['--demo=navigator'], true), { kind: 'navigator', lab: undefined });
  assert.deepEqual(demoStart(['--demo=app'], false), { kind: 'app' });
});

test('an unknown id is not this function\'s to judge (the navigator shows it), but malformed arguments are errors', () => {
  assert.deepEqual(demoStart(['--lab=nonexistent'], false), { kind: 'navigator', lab: 'nonexistent' });
  assert.throws(() => demoStart(['--lab='], false), /--lab= needs the id of a lab/);
  assert.throws(() => demoStart(['--demo=tabs'], false), /--demo=tabs: the demo is app or navigator/);
  assert.throws(() => demoStart(['--demo=app', '--lab=glass'], false), /opens the navigator, not --demo=app/);
});

test('pnpm demo moves the demo\'s own arguments after Godot\'s `--`, and leaves every other argument where it was', () => {
  assert.deepEqual(demoArguments([]), []);
  assert.deepEqual(demoArguments(['--lab=glass']), ['--', '--lab=glass']);
  assert.deepEqual(demoArguments(['--lab=glass', '--quit-after', '5']), ['--quit-after', '5', '--', '--lab=glass']);
  assert.deepEqual(demoArguments(['--', '--lab=glass']), ['--', '--lab=glass'], 'a separator the caller wrote is not repeated');
  assert.deepEqual(demoArguments(['--rendering-method', 'mobile', '--', '--verify']), ['--rendering-method', 'mobile', '--', '--verify']);
  assert.deepEqual(demoArguments(['--demo=app', '--', '--verify']), ['--', '--verify', '--demo=app']);
});
