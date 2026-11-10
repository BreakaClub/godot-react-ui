// Reads which architectures a Mach-O file holds, which is what tells a universal macOS library from one built for a single architecture: both
// have the same name, and Godot loads either, on the architecture it has. The layouts are <mach-o/fat.h> and <mach-o/loader.h>; the CPU
// types are <mach/machine.h>.

const MAGIC_BYTES = 4;
// A universal file's header and its table are big-endian whatever the architectures in it.
const FAT_MAGIC = 0xcafebabe;
const FAT_MAGIC_64 = 0xcafebabf;
const FAT_HEADER_BYTES = 8; // the magic and the count
const FAT_ARCH_BYTES = 20; // cputype, cpusubtype, offset, size, align: 32 bits each
const FAT_ARCH_64_BYTES = 32; // offset and size are 64 bits, and a reserved word follows align
// A 64-bit file of one architecture, whose header is in that architecture's byte order: little-endian for both of these.
const MH_MAGIC_64 = 0xfeedfacf;
const MACH_HEADER_CPU_OFFSET = 4;
const CPU_NAMES = new Map([
  [0x01000007, 'x86_64'], // CPU_TYPE_X86_64
  [0x0100000c, 'arm64'], // CPU_TYPE_ARM64
]);

const cpuName = type => CPU_NAMES.get(type) ?? `CPU type 0x${type.toString(16)}`;

/** The architectures a Mach-O file holds, by the names Godot's feature tags give them. Throws if `bytes` is not a Mach-O file. */
export function machOArchitectures(bytes) {
  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.length >= MACH_HEADER_CPU_OFFSET + MAGIC_BYTES && view.readUInt32LE(0) === MH_MAGIC_64) return [cpuName(view.readUInt32LE(MACH_HEADER_CPU_OFFSET))];
  const magic = view.length >= FAT_HEADER_BYTES ? view.readUInt32BE(0) : undefined;
  if (magic !== FAT_MAGIC && magic !== FAT_MAGIC_64) throw new Error('Not a Mach-O file.');
  const count = view.readUInt32BE(MAGIC_BYTES);
  const entryBytes = magic === FAT_MAGIC_64 ? FAT_ARCH_64_BYTES : FAT_ARCH_BYTES;
  if (view.length < FAT_HEADER_BYTES + count * entryBytes) throw new Error('The universal Mach-O file ends inside its table of architectures.');
  return Array.from({ length: count }, (_, index) => cpuName(view.readUInt32BE(FAT_HEADER_BYTES + index * entryBytes)));
}
