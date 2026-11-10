import { BINARY_TARGETS, type BinaryTarget } from '../scripts/native-binding.mjs';
// The smallest files the binary readers (scripts/macho.mjs, scripts/wasm-memory.mjs) take for what they are: headers only, no code.

const UINT32_BYTES = 4;

function words(values: readonly number[], littleEndian: boolean): Uint8Array {
  const bytes = new Uint8Array(values.length * UINT32_BYTES);
  const view = new DataView(bytes.buffer);
  values.forEach((value, index) => view.setUint32(index * UINT32_BYTES, value, littleEndian));
  return bytes;
}

export const CPU_X86_64 = 0x01000007;
export const CPU_ARM64 = 0x0100000c;

/** The start of a 64-bit Mach-O file of one architecture: MH_MAGIC_64 and the CPU type, little-endian. */
export const thinMachO = (cpu: number): Uint8Array => words([0xfeedfacf, cpu], true);

/** A universal Mach-O header: FAT_MAGIC, the count and one `fat_arch` (cputype, cpusubtype, offset, size, align) per CPU, big-endian. */
export const universalMachO = (cpus: readonly number[]): Uint8Array => words([0xcafebabe, cpus.length, ...cpus.flatMap(cpu => [cpu, 0, 0, 0, 0])], false);

const ascii = (text: string): number[] => [text.length, ...Buffer.from(text, 'ascii')];

/** A WebAssembly module that imports a function type and then `env.memory`, shared or not, as a side module does. */
export function wasmImportingMemory(shared: boolean): Uint8Array {
  const functionImport = [...ascii('env'), ...ascii('f'), 0x00, 0x00];
  // limits: 0x03 is a shared memory with a maximum (a shared memory must have one), 0x00 an unshared one without.
  const memoryImport = [...ascii('env'), ...ascii('memory'), 0x02, ...(shared ? [0x03, 0x01, 0x01] : [0x00, 0x01])];
  const imports = [0x02, ...functionImport, ...memoryImport];
  // A custom section first, so the reader has one to skip.
  const custom = [0x00, 0x02, 0x01, 0x78];
  return Uint8Array.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, ...custom, 0x02, imports.length, ...imports]);
}

/** A build of the table by name; a name the table lacks fails the test that asked for it. */
export function binaryTarget(name: string): BinaryTarget {
  const target = BINARY_TARGETS[name];
  if (target === undefined) throw new Error(`BINARY_TARGETS has no ${name}`);
  return target;
}
