import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { WEB_LIBRARY_NAMES } from '../scripts/engine.mjs';
import { RELEASE_TARGETS } from '../scripts/native-binding.mjs';
import { binaryTarget } from './binary-fixtures';

// One table says which libraries there are (scripts/native-binding.mjs's BINARY_TARGETS, and scripts/engine.mjs's two Web side modules). The
// extension's manifest and the workflow that builds a release each write the same names out again, where nothing but these tests would
// notice one of them falling behind: a library that is built and not listed never loads, and one listed and not built stops the release.

const root = resolve(__dirname, '..');
const INSTALLED_BIN = 'res://addons/godot-react-ui/bin/';
const BUILDS = ['debug', 'release'];
const THREADINGS = ['threads', 'nothreads'] as const;
/** The platforms whose library the workflow can run: the official editor exists for them. */
const DESKTOP = ['macos', 'linux', 'windows'];

function expectedManifest(): Record<string, string> {
  const libraries: Record<string, string> = {};
  for (const name of RELEASE_TARGETS) {
    const target = binaryTarget(name);
    for (const build of BUILDS) for (const feature of target.features) libraries[`${target.platform}.${build}.${feature}`] = `${INSTALLED_BIN}${target.library}`;
  }
  for (const threading of THREADINGS) for (const build of BUILDS) libraries[`web.${build}.${threading}.wasm32`] = `${INSTALLED_BIN}${WEB_LIBRARY_NAMES[threading]}`;
  return libraries;
}

test('a release ships the universal macOS library and every library of another platform', () => {
  assert.deepEqual([...RELEASE_TARGETS].sort(), ['android.arm64', 'android.x86_64', 'ios.arm64', 'linux.arm64', 'linux.x86_64', 'macos.universal', 'windows.arm64', 'windows.x86_64']);
  const libraries = RELEASE_TARGETS.map(name => binaryTarget(name).library);
  assert.equal(new Set(libraries).size, libraries.length, 'each shipped build has a file name of its own: they share one bin directory');
});

test('react_ui.gdextension lists exactly the libraries of the table, under the feature tags Godot selects them by', () => {
  const manifest = readFileSync(resolve(root, 'demo/addons/godot-react-ui/react_ui.gdextension'), 'utf8');
  const section = manifest.slice(manifest.indexOf('[libraries]'));
  const listed: Record<string, string> = {};
  for (const { groups } of section.matchAll(/^(?<tags>[^=\s[]+)\s*=\s*"(?<path>.+)"\s*$/gmu)) {
    const { tags, path } = groups ?? {};
    assert.ok(tags !== undefined && path !== undefined);
    assert.equal(listed[tags], undefined, `${tags} is listed twice`);
    listed[tags] = path;
  }
  assert.deepEqual(listed, expectedManifest());
});

/** The entries of a job's `matrix.include` in build.yml, as the scalars each one sets. */
function matrixEntries(workflow: string, job: string, firstKey: string): Record<string, string>[] {
  const start = workflow.indexOf(`\n  ${job}:\n`);
  assert.notEqual(start, -1, `build.yml has a ${job} job`);
  const next = /\n  [a-z-]+:\n/u.exec(workflow.slice(start + 1));
  const body = workflow.slice(start, next ? start + 1 + next.index : undefined);
  const entries: Record<string, string>[] = [];
  for (const line of body.split('\n')) {
    const first = new RegExp(`^ +- ${firstKey}: (?<value>.+)$`, 'u').exec(line)?.groups?.value;
    if (first !== undefined) {
      entries.push({ [firstKey]: first });
      continue;
    }
    const { key, value } = /^ {12}(?<key>[a-z-]+): (?<value>.+)$/u.exec(line)?.groups ?? {};
    const current = entries.at(-1);
    if (key !== undefined && value !== undefined && current) current[key] = value;
    else if (entries.length > 0 && /^ {4}\S/u.test(line)) break;
  }
  return entries;
}

test('build.yml builds each shipped library from the table\'s Rust targets, uploads it under its name, and loads the desktop ones', () => {
  const workflow = readFileSync(resolve(root, '.github/workflows/build.yml'), 'utf8');
  const entries = matrixEntries(workflow, 'native', 'target');
  assert.deepEqual(entries.map(entry => entry.target).sort(), [...RELEASE_TARGETS].sort());
  for (const entry of entries) {
    assert.ok(entry.target !== undefined && entry.triples !== undefined);
    const target = binaryTarget(entry.target);
    assert.deepEqual(entry.triples.split(' '), [...target.triples], `${entry.target} installs the Rust targets it compiles`);
    assert.equal(entry.library, target.library, `${entry.target} uploads the file the build leaves`);
    assert.ok(entry.runner, `${entry.target} names its runner`);
    assert.equal(entry['godot-archive'] !== undefined, DESKTOP.includes(target.platform), `${entry.target}: a desktop library is loaded in the stock editor, and only those can be`);
    assert.equal(entry['godot-binary'] !== undefined, entry['godot-archive'] !== undefined);
  }
  assert.deepEqual(
    matrixEntries(workflow, 'web', 'threading').map(({ threading, library, flag }) => ({ threading, library, flag })),
    [
      { threading: 'threads', library: WEB_LIBRARY_NAMES.threads, flag: undefined },
      { threading: 'nothreads', library: WEB_LIBRARY_NAMES.nothreads, flag: '--nothreads' },
    ],
  );
});
