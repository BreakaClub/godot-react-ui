// Reads whether a WebAssembly module imports a shared memory, which is what tells a threaded Web side module from an unthreaded one: an engine
// built with threads gives its side modules a shared memory, one built without gives them an unshared one, and a module that imports the
// other kind fails to instantiate. `WebAssembly.Module.imports` does not report it, so this reads the import section itself
// (https://webassembly.github.io/spec/core/binary/modules.html#import-section).

const WASM_MAGIC = 0x6d736100; // "\0asm", little-endian
const HEADER_BYTES = 8; // the magic and the version
const IMPORT_SECTION = 2;
// Import kinds (the `importdesc` byte).
const KIND_FUNCTION = 0x00;
const KIND_TABLE = 0x01;
const KIND_MEMORY = 0x02;
const KIND_GLOBAL = 0x03;
const KIND_TAG = 0x04;
// Bits of a `limits` flags byte.
const LIMITS_HAS_MAXIMUM = 0x01;
const LIMITS_SHARED = 0x02;
const LEB_PAYLOAD_BITS = 7;
const LEB_CONTINUES = 0x80;
const LEB_PAYLOAD = 0x7f;

function reader(bytes) {
  let offset = 0;
  const byte = () => {
    if (offset >= bytes.length) throw new Error('The module ends inside its import section.');
    return bytes[offset++];
  };
  /** An unsigned LEB128 number. Sizes and counts fit a double; a 64-bit memory limit loses precision, and is only skipped here. */
  const unsigned = () => {
    let value = 0;
    let scale = 1;
    for (;;) {
      const next = byte();
      value += (next & LEB_PAYLOAD) * scale;
      if ((next & LEB_CONTINUES) === 0) return value;
      scale *= 2 ** LEB_PAYLOAD_BITS;
    }
  };
  return {
    byte, unsigned,
    skip: (count) => { offset += count; },
    name: () => {
      const length = unsigned();
      const text = Buffer.from(bytes.subarray(offset, offset + length)).toString('utf8');
      offset += length;
      return text;
    },
    get offset() { return offset; },
    get done() { return offset >= bytes.length; },
  };
}

function limits(read) {
  const flags = read.byte();
  read.unsigned();
  if ((flags & LIMITS_HAS_MAXIMUM) !== 0) read.unsigned();
  return flags;
}

/**
 * Whether the memory a module imports is shared. Throws if `bytes` is not a WebAssembly module or imports no memory (a side module always
 * imports the engine's).
 */
export function importsSharedMemory(bytes) {
  if (bytes.length < HEADER_BYTES || Buffer.from(bytes.subarray(0, 4)).readUInt32LE(0) !== WASM_MAGIC) throw new Error('Not a WebAssembly module.');
  const read = reader(bytes);
  read.skip(HEADER_BYTES);
  while (!read.done) {
    const id = read.byte();
    const size = read.unsigned();
    if (id !== IMPORT_SECTION) {
      read.skip(size);
      continue;
    }
    const count = read.unsigned();
    for (let index = 0; index < count; index += 1) {
      read.name();
      read.name();
      const kind = read.byte();
      if (kind === KIND_MEMORY) return (limits(read) & LIMITS_SHARED) !== 0;
      if (kind === KIND_FUNCTION) read.unsigned();
      else if (kind === KIND_TABLE) {
        read.byte(); // the element type
        limits(read);
      } else if (kind === KIND_GLOBAL) read.skip(2); // the value type and the mutability
      else if (kind === KIND_TAG) {
        read.byte(); // the attribute
        read.unsigned();
      } else throw new Error(`The import section has an import of unknown kind ${kind}.`);
    }
    break;
  }
  throw new Error('The module imports no memory.');
}
