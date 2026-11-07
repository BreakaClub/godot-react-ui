import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { DEMO_ENTRY_POINTS, DEMO_RELEASE_ENTRY_POINTS } from '../scripts/demo-entry-points.mjs';
import { readPackEntries } from '../scripts/pack-contents.mjs';
import {
  assertReleasePack, autoloadScripts, planReleaseStage, planReleaseStageOf, releasePackViolations, scriptName, scriptsOfScene, stageReleaseProject,
} from '../scripts/release-stage.mjs';

// The release Web export holds what the deployed playground runs and no more (scripts/release-stage.mjs, docs/tracks/web-load.md).

const root = resolve(__dirname, '..');
const demo = resolve(root, 'demo');

function temporaryDirectory(): string {
  return mkdtempSync(join(tmpdir(), 'release-stage-test-'));
}

/** A pack the way the engine writes format 4 (core/io/file_access_pack.cpp): header, file data, then the directory last. */
function writePack(path: string, files: ReadonlyArray<{ path: string; bytes: Buffer }>, { version = 4, flags = 2, magic = 0x43504447 } = {}): void {
  const header = Buffer.alloc(32 + 8 + 16 * 4);
  header.writeUInt32LE(magic, 0);
  header.writeUInt32LE(version, 4);
  header.writeUInt32LE(4, 8);
  header.writeUInt32LE(8, 12);
  header.writeUInt32LE(flags, 20);
  const data: Buffer[] = [];
  let offset = 0;
  const records: Buffer[] = [];
  for (const file of files) {
    const name = Buffer.from(file.path);
    const padded = Buffer.alloc(name.length + ((4 - (name.length % 4)) % 4));
    name.copy(padded);
    const record = Buffer.alloc(4 + padded.length + 8 + 8 + 16 + 4);
    record.writeUInt32LE(padded.length, 0);
    padded.copy(record, 4);
    record.writeBigUInt64LE(BigInt(offset), 4 + padded.length);
    record.writeBigUInt64LE(BigInt(file.bytes.length), 4 + padded.length + 8);
    records.push(record);
    data.push(file.bytes);
    offset += file.bytes.length;
  }
  const count = Buffer.alloc(4);
  count.writeUInt32LE(files.length, 0);
  header.writeBigUInt64LE(BigInt(header.length), 24);
  header.writeBigUInt64LE(BigInt(header.length + offset), 32);
  writeFileSync(path, Buffer.concat([header, ...data, count, ...records]));
}

const plan = planReleaseStage({
  entryPoints: ['demo/src/main.ts', 'demo/src/scene-launcher.ts', 'demo/src/verify.ts', 'demo/src/probe.ts', 'demo/src/app.tsx'],
  releaseEntryPoints: ['demo/src/main.ts', 'demo/src/scene-launcher.ts'],
  sceneScripts: new Map([['main.tscn', ['demo/src/main.ts']], ['probe.tscn', ['demo/src/probe.ts']]]),
  autoloads: ['demo/src/scene-launcher.ts'],
});

test('the release keeps exactly the scripts the deployed playground starts, and the real project agrees', () => {
  const real = planReleaseStageOf(demo);
  assert.deepEqual(real.keptScripts, ['main', 'scene-launcher', 'world-main']);
  assert.deepEqual(real.keptScenes, ['main.tscn', 'world.tscn']);
  assert.deepEqual(real.removedScenes, ['a11y.tscn', 'text-layout-probe.tscn']);
  // Every demo script is kept or removed, none both: nothing is lost track of when a script is added.
  const scripts = DEMO_ENTRY_POINTS.filter(entry => entry.endsWith('.ts')).map(scriptName).sort();
  assert.deepEqual([...real.keptScripts, ...real.removedScripts].sort(), scripts);
  assert.equal(new Set([...real.keptScripts, ...real.removedScripts]).size, scripts.length);
  // The verifiers and probes are what is left out.
  for (const name of ['verify', 'verify-interaction', 'verifier-input', 'probe', 'text-layout-probe', 'verify-world']) assert.ok(real.removedScripts.includes(name), name);
});

test('every release script is a demo entry point, and the project\'s scenes and autoloads only name release scripts or scripts the release drops with them', () => {
  for (const entry of DEMO_RELEASE_ENTRY_POINTS) assert.ok(DEMO_ENTRY_POINTS.includes(entry), `${entry} is not an entry point`);
  const project = readFileSync(resolve(demo, 'project.godot'), 'utf8');
  for (const autoload of autoloadScripts(project)) assert.ok(DEMO_RELEASE_ENTRY_POINTS.includes(autoload), `${autoload} starts with the project and must ship`);
  const scenes = readdirSync(demo).filter(name => name.endsWith('.tscn'));
  assert.ok(scenes.length >= 4);
  // `planReleaseStageOf` throws for a scene that is half kept; reaching here means each scene is whole.
  assert.doesNotThrow(() => planReleaseStageOf(demo));
});

test('a scene\'s scripts and the autoloads are read from the files Godot reads', () => {
  assert.deepEqual(scriptsOfScene('[gd_scene load_steps=2 format=3]\n\n[ext_resource type="Script" path="res://src/main.ts" id="1"]\n\n[node name="Demo" type="Node"]\n'), ['demo/src/main.ts']);
  assert.deepEqual(scriptsOfScene('[ext_resource type="PackedScene" path="res://other.tscn" id="1"]'), []);
  assert.deepEqual(autoloadScripts('[application]\nconfig/name="x"\n\n[autoload]\n\nSceneLauncher="*res://src/scene-launcher.ts"\nOther="res://src/other.ts"\n\n[display]\nwindow/size/viewport_width=1\n'), ['demo/src/scene-launcher.ts', 'demo/src/other.ts']);
  assert.deepEqual(autoloadScripts('[application]\nconfig/name="x"\n'), []);
});

test('a plan refuses what would ship broken: a dropped autoload, a half-kept scene, a release script that is not an entry point', () => {
  const entryPoints = ['demo/src/main.ts', 'demo/src/scene-launcher.ts', 'demo/src/verify.ts'];
  assert.throws(() => planReleaseStage({ entryPoints, releaseEntryPoints: ['demo/src/main.ts'], sceneScripts: new Map(), autoloads: ['demo/src/scene-launcher.ts'] }), /autoload demo\/src\/scene-launcher\.ts is not a release entry point/u);
  assert.throws(() => planReleaseStage({
    entryPoints, releaseEntryPoints: ['demo/src/main.ts'], sceneScripts: new Map([['both.tscn', ['demo/src/main.ts', 'demo/src/verify.ts']]]), autoloads: [],
  }), /both\.tscn names release scripts and others/u);
  assert.throws(() => planReleaseStage({ entryPoints, releaseEntryPoints: ['demo/src/ghost.ts'], sceneScripts: new Map(), autoloads: [] }), /not demo entry points: demo\/src\/ghost\.ts/u);
  assert.throws(() => scriptName('demo/src/app.tsx'), /not a demo script/u);
});

test('staging copies the project, takes out the left-out scripts, scenes and every source map, and leaves the project alone', () => {
  const directory = temporaryDirectory();
  try {
    const project = join(directory, 'project');
    for (const path of ['src', '.godot/GodotJS/src', 'fonts']) mkdirSync(join(project, path), { recursive: true });
    const files: Record<string, string> = {
      'project.godot': 'p', 'main.tscn': 'm', 'probe.tscn': 'q', 'probe.tscn.uid': 'u', 'fonts/a.ttf': 'f',
      'src/main.ts': 'a', 'src/main.ts.uid': 'a', 'src/verify.ts': 'b', 'src/verify.ts.uid': 'b', 'src/probe.ts': 'c', 'src/scene-launcher.ts': 'd',
      '.godot/GodotJS/src/main.js': 'js', '.godot/GodotJS/src/main.js.map': 'map', '.godot/GodotJS/src/verify.js': 'js', '.godot/GodotJS/src/verify.js.map': 'map',
      '.godot/GodotJS/src/probe.js': 'js', '.godot/GodotJS/src/scene-launcher.js': 'js', '.godot/GodotJS/src/scene-launcher.js.map': 'map',
    };
    for (const [path, text] of Object.entries(files)) writeFileSync(join(project, path), text);
    const stamp = new Date('2026-01-02T03:04:05Z');
    utimesSync(join(project, 'fonts/a.ttf'), stamp, stamp);

    const stage = stageReleaseProject({ demoDirectory: project, stageDirectory: join(directory, 'stage'), plan });
    const left = (base: string): string[] => readdirSync(base, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile())
      .map(entry => join(entry.parentPath, entry.name).slice(base.length + 1)).sort();
    assert.deepEqual(left(stage), [
      '.godot/GodotJS/src/main.js', '.godot/GodotJS/src/scene-launcher.js', 'fonts/a.ttf', 'main.tscn', 'project.godot', 'src/main.ts', 'src/main.ts.uid', 'src/scene-launcher.ts',
    ]);
    assert.equal(statSync(join(stage, 'fonts/a.ttf')).mtimeMs, stamp.getTime(), 'the editor decides what to import from timestamps');
    assert.deepEqual(left(project), Object.keys(files).sort(), 'the project is untouched');
    // Staging again starts from a clean stage.
    writeFileSync(join(stage, 'stale.txt'), 'x');
    stageReleaseProject({ demoDirectory: project, stageDirectory: stage, plan });
    assert.equal(existsSync(join(stage, 'stale.txt')), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('a pack that holds a source map, an extra script, a removed scene, or lacks a release script is not a release pack', () => {
  const entry = (path: string) => ({ path, size: 1 });
  const clean = ['.godot/GodotJS/src/main.js', 'src/main.ts.remap', '.godot/GodotJS/src/scene-launcher.js', 'src/scene-launcher.ts.remap', 'main.tscn.remap', 'fonts/a.ttf.import'].map(entry);
  assert.deepEqual(releasePackViolations(clean, plan), []);
  assert.match(releasePackViolations([...clean, entry('.godot/GodotJS/src/main.js.map')], plan).join('\n'), /main\.js\.map: a source map/u);
  assert.match(releasePackViolations([...clean, entry('.godot/GodotJS/src/verify.js')], plan).join('\n'), /verify\.js: a compiled script that is not a release script/u);
  assert.match(releasePackViolations([...clean, entry('src/verify.ts.remap')], plan).join('\n'), /verify\.ts\.remap: the remap of a script/u);
  assert.match(releasePackViolations([...clean, entry('probe.tscn.remap')], plan).join('\n'), /probe\.tscn\.remap: a scene that exists for verification/u);
  assert.match(releasePackViolations([...clean, entry('.godot/exported/1/export-abc-probe.scn')], plan).join('\n'), /export-abc-probe\.scn: a scene/u);
  assert.match(releasePackViolations(clean.filter(item => item.path !== 'src/main.ts.remap'), plan).join('\n'), /src\/main\.ts\.remap: missing/u);
  assert.match(releasePackViolations(clean.filter(item => item.path !== '.godot/GodotJS/src/main.js'), plan).join('\n'), /GodotJS\/src\/main\.js: missing/u);
});

test('the pack directory is read as the engine writes it, and a pack the reader does not understand is refused', () => {
  const directory = temporaryDirectory();
  try {
    const path = join(directory, 'index.pck');
    const files = [
      { path: 'src/main.ts.remap', bytes: Buffer.from('abc') },
      { path: '.godot/GodotJS/src/main.js', bytes: Buffer.alloc(1000, 1) },
      { path: 'x', bytes: Buffer.alloc(0) },
    ];
    writePack(path, files);
    assert.deepEqual(readPackEntries(path), files.map(file => ({ path: file.path, size: file.bytes.length })));
    writePack(path, files, { magic: 0x12345678 });
    assert.throws(() => readPackEntries(path), /not a Godot pack/u);
    writePack(path, files, { version: 2 });
    assert.throws(() => readPackEntries(path), /pack format 2/u);
    writePack(path, files, { flags: 1 });
    assert.throws(() => readPackEntries(path), /encrypted directory/u);
    writePack(path, files);
    writeFileSync(path, readFileSync(path).subarray(0, 120));
    assert.throws(() => readPackEntries(path), /./u, 'a truncated pack is an error, not a short list');
    writePack(path, [{ path: 'src/main.ts.remap', bytes: Buffer.from('a') }, { path: '.godot/GodotJS/src/main.js.map', bytes: Buffer.from('b') }]);
    assert.throws(() => assertReleasePack(path, plan), /not a release pack \(\d+ problems\)[\s\S]*main\.js\.map: a source map/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
