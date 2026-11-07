import { closeSync, openSync, readSync, fstatSync } from 'node:fs';

/**
 * The file directory of a Godot pack (`.pck`), read the way the engine reads it (core/io/file_access_pack.cpp, `PackedSourcePCK::try_open_pack`),
 * so a build can say what a release pack holds and refuse one that holds what it should not (scripts/release-stage.mjs).
 *
 * Header, little-endian: magic `GDPC`, format version, engine major, minor, patch, pack flags, file base (u64), and from format 3 the directory
 * offset (u64) and a reserved block. The directory is a u32 count and per file: u32 path length, the path (padded with NULs to a multiple of 4),
 * u64 offset, u64 size, 16 bytes of MD5, u32 flags.
 */

const PACK_MAGIC = 0x43504447;
const SUPPORTED_VERSIONS = [3, 4];
const PACK_DIRECTORY_ENCRYPTED = 1;
const HEADER_BYTES_BEFORE_DIRECTORY_OFFSET = 4 + 4 + 12 + 4 + 8;
const DIRECTORY_OFFSET_BYTES = 8;
const FILE_RECORD_FIXED_BYTES = 8 + 8 + 16 + 4;

function readAt(descriptor, length, position) {
  const buffer = Buffer.alloc(length);
  let read = 0;
  while (read < length) {
    const count = readSync(descriptor, buffer, read, length - read, position + read);
    if (count === 0) throw new Error(`The pack ends ${length - read} bytes short at offset ${position + read}`);
    read += count;
  }
  return buffer;
}

/** Every file in the pack at `path`: `{ path, size }`, paths as the engine stores them (no `res://`). */
export function readPackEntries(path) {
  const descriptor = openSync(path, 'r');
  try {
    const header = readAt(descriptor, HEADER_BYTES_BEFORE_DIRECTORY_OFFSET + DIRECTORY_OFFSET_BYTES, 0);
    if (header.readUInt32LE(0) !== PACK_MAGIC) throw new Error(`${path} is not a Godot pack (bad magic)`);
    const version = header.readUInt32LE(4);
    if (!SUPPORTED_VERSIONS.includes(version)) throw new Error(`${path} has pack format ${version}; this reads ${SUPPORTED_VERSIONS.join(' and ')}`);
    if (header.readUInt32LE(20) & PACK_DIRECTORY_ENCRYPTED) throw new Error(`${path} has an encrypted directory`);
    const directoryOffset = Number(header.readBigUInt64LE(HEADER_BYTES_BEFORE_DIRECTORY_OFFSET));
    const directory = readAt(descriptor, fstatSync(descriptor).size - directoryOffset, directoryOffset);
    const count = directory.readUInt32LE(0);
    let cursor = 4;
    const entries = [];
    for (let index = 0; index < count; index++) {
      const length = directory.readUInt32LE(cursor);
      cursor += 4;
      const name = directory.toString('utf8', cursor, cursor + length).replace(/\0+$/u, '');
      cursor += length;
      const size = Number(directory.readBigUInt64LE(cursor + 8));
      cursor += FILE_RECORD_FIXED_BYTES;
      entries.push({ path: name, size });
    }
    if (cursor !== directory.length) throw new Error(`${path}: the directory of ${count} files ends at ${cursor}, the file at ${directory.length}`);
    return entries;
  } finally {
    closeSync(descriptor);
  }
}
