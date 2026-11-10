import assert from 'node:assert/strict';
import { test } from 'node:test';
import { machOArchitectures } from '../scripts/macho.mjs';
import { importsSharedMemory } from '../scripts/wasm-memory.mjs';
import { CPU_ARM64, CPU_X86_64, thinMachO, universalMachO, wasmImportingMemory } from './binary-fixtures';

// What a release checks its libraries with (scripts/stage-addon.mjs, scripts/build-web.mjs): a file's name does not say which architectures
// or which threading is under it.

test('a Mach-O file names the architectures it holds, one or several', () => {
  assert.deepEqual(machOArchitectures(thinMachO(CPU_ARM64)), ['arm64']);
  assert.deepEqual(machOArchitectures(thinMachO(CPU_X86_64)), ['x86_64']);
  assert.deepEqual(machOArchitectures(universalMachO([CPU_X86_64, CPU_ARM64])), ['x86_64', 'arm64']);
  assert.deepEqual(machOArchitectures(thinMachO(0x7)), ['CPU type 0x7'], 'an architecture with no Godot name is still reported');
});

test('a file that is not Mach-O, or a universal one cut short, is an error and not an empty list', () => {
  assert.throws(() => machOArchitectures(new Uint8Array(0)), /Not a Mach-O file/u);
  assert.throws(() => machOArchitectures(wasmImportingMemory(true)), /Not a Mach-O file/u);
  assert.throws(() => machOArchitectures(universalMachO([CPU_ARM64, CPU_X86_64]).subarray(0, 12)), /ends inside its table/u);
});

test('a side module says whether the memory it imports is shared', () => {
  assert.equal(importsSharedMemory(wasmImportingMemory(true)), true);
  assert.equal(importsSharedMemory(wasmImportingMemory(false)), false);
});

test('a file that is not a module, or a module that imports no memory, is an error', () => {
  assert.throws(() => importsSharedMemory(thinMachO(CPU_ARM64)), /Not a WebAssembly module/u);
  assert.throws(() => importsSharedMemory(Uint8Array.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])), /imports no memory/u);
  assert.throws(() => importsSharedMemory(wasmImportingMemory(true).subarray(0, 20)), /ends inside its import section/u);
});
