import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, type TestContext } from 'node:test';
import { WEB_LIBRARY_NAMES } from '../scripts/engine.mjs';
import { RELEASE_TARGETS } from '../scripts/native-binding.mjs';
import { binaryTarget, CPU_ARM64, CPU_X86_64, thinMachO, universalMachO, wasmImportingMemory } from './binary-fixtures';

// A release stages with `--require-all-platforms` (.github/workflows/ci.yml and release.yml): a package that lacks a platform's library
// loads on the others and fails on that one, so the staging refuses it instead of packing it. The same for a macOS library that holds one
// architecture of the two, and for a Web side module of the other threading under a name. These run the refusals only: a staging that
// succeeds writes the repository's own `addon/`, which the workflows' package jobs do for real.

const root = resolve(__dirname, '..');
const script = join(root, 'scripts', 'stage-addon.mjs');
const manifest = join(root, 'demo', 'addons', 'godot-react-ui', 'react_ui.gdextension');
const FLAG = '--require-all-platforms';
const MACOS_LIBRARY = binaryTarget('macos.universal').library;

/** Every library a release has, as the smallest file that is what its name says. The other platforms' are not read, and are empty. */
function everyLibrary(): Map<string, Uint8Array> {
  const libraries = new Map<string, Uint8Array>(RELEASE_TARGETS.map(name => [binaryTarget(name).library, new Uint8Array(0)]));
  libraries.set(MACOS_LIBRARY, universalMachO([CPU_X86_64, CPU_ARM64]));
  libraries.set(WEB_LIBRARY_NAMES.threads, wasmImportingMemory(true));
  libraries.set(WEB_LIBRARY_NAMES.nothreads, wasmImportingMemory(false));
  return libraries;
}

function stage(t: TestContext, libraries: ReadonlyMap<string, Uint8Array>): { status: number | null; stdout: string; stderr: string } {
  const source = mkdtempSync(join(tmpdir(), 'stage-addon-'));
  t.after(() => rmSync(source, { recursive: true, force: true }));
  copyFileSync(manifest, join(source, 'react_ui.gdextension'));
  mkdirSync(join(source, 'bin'));
  for (const [name, bytes] of libraries) writeFileSync(join(source, 'bin', name), bytes);
  return spawnSync('node', [script, FLAG, `--source=${source}`], { encoding: 'utf8', timeout: 30_000, cwd: root });
}

test('a source without one of the manifest\'s libraries is refused, naming it, before anything is staged', t => {
  const libraries = everyLibrary();
  libraries.delete(WEB_LIBRARY_NAMES.nothreads);
  libraries.delete(binaryTarget('windows.arm64').library);
  const result = stage(t, libraries);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--require-all-platforms: .* lacks godot_react_ui\.windows\.arm64\.dll, godot_react_ui\.web\.nothreads\.wasm \(react_ui\.gdextension names libgodot_react_ui\.dylib, .*\)\. Nothing was staged\./u);
  assert.equal(result.stdout, '', 'nothing was staged or printed before the refusal');
});

test('a macOS library of one architecture is refused: the manifest gives the one file to both', t => {
  const libraries = everyLibrary();
  libraries.set(MACOS_LIBRARY, thinMachO(CPU_ARM64));
  const result = stage(t, libraries);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--require-all-platforms: libgodot_react_ui\.dylib holds arm64 and not x86_64\. Nothing was staged\./u);
  assert.equal(result.stdout, '');
});

test('a Web side module of the other threading is refused under either name', t => {
  const libraries = everyLibrary();
  libraries.set(WEB_LIBRARY_NAMES.threads, wasmImportingMemory(false));
  libraries.set(WEB_LIBRARY_NAMES.nothreads, wasmImportingMemory(true));
  const result = stage(t, libraries);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /godot_react_ui\.web\.wasm imports an unshared memory, so it is not a side module with threads; godot_react_ui\.web\.nothreads\.wasm imports a shared memory, so it is not a side module without threads\. Nothing was staged\./u);
  assert.equal(result.stdout, '');
});

test('a source that is not there is an error for a release, not the warning a checkout gets', t => {
  const parent = mkdtempSync(join(tmpdir(), 'stage-addon-'));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const result = spawnSync('node', [script, FLAG, `--source=${join(parent, 'missing')}`], { encoding: 'utf8', timeout: 30_000, cwd: root });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--require-all-platforms: source directory not found: .*missing/u);
  assert.equal(result.stdout, '');
});
