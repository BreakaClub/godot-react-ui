import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { contentTypeOf, objectKey } from '../../deploy/release-layout.mjs';
import { brotliCopyOf } from '../release-bundle.mjs';
import { LICENSE_FILE, MANIFEST_FILE, OBJECT_HASH_LENGTH, manifestObjects, manifestProblems, sha256Hex } from './manifest.mjs';
import { FONT_SLICES_DIRECTORY } from './paths.mjs';

// What a deploy does about the font slices (docs/tracks/font-slices.md). The manifest and the licence are release files and are published with the
// release like any other; the family indexes and the slices are not part of any release: they are content-addressed objects in the same bucket
// (`objects/<hash>`, served at `/o/<hash>/<name>`), shared by every release whose manifest names them, so a deploy that changes no slice uploads none.

/** The directory the slices are read from: `artifacts/font-slices/dist`, whose layout is the layout of the URLs (`o/<hash>/<name>`). */
function objectFile(directory, path) {
  return join(directory, 'o', ...path.split('/'));
}

/** The family indexes of a manifest, read from `directory`'s `o/`. */
function readIndexes(manifest, directory) {
  return new Map(manifest.families.map(family => [family.id, JSON.parse(readFileSync(objectFile(directory, family.index.path), 'utf8'))]));
}

/** The bucket key of the object at `path` (`<hash>/<name>`). */
function keyOfPath(path) {
  const hash = path.slice(0, path.indexOf('/'));
  if (hash.length !== OBJECT_HASH_LENGTH) throw new Error(`Not an object path: ${path}`);
  return objectKey(hash, 'identity');
}

/**
 * Plan the slice objects of the release export in `exportDirectory`, which must carry the manifest and licence the slice build made, and the slice build
 * in `directory` must be the one they came from. Every object is read and checked against the size and SHA-256 the manifest pins before it is offered for
 * upload: a deploy never puts a file the manifest does not describe. Returns the manifest, and the objects with where each is read from and how it is stored
 * (an index also has a brotli copy, as a release's JSON does; a font is compressed already).
 */
export async function planFontSlices({ exportDirectory, cacheDirectory, directory = FONT_SLICES_DIRECTORY }) {
  const exportedManifest = join(exportDirectory, MANIFEST_FILE);
  if (!existsSync(exportedManifest)) {
    throw new Error(`The release export has no ${MANIFEST_FILE}. Run \`node scripts/build-font-slices.mjs\`, then \`node scripts/build-web.mjs --release --export-only\`.`);
  }
  if (!existsSync(join(exportDirectory, LICENSE_FILE))) throw new Error(`The release export has no ${LICENSE_FILE}; the slices may not be published without their licence.`);
  const builtManifest = join(directory, MANIFEST_FILE);
  if (!existsSync(builtManifest) || sha256Hex(readFileSync(builtManifest)) !== sha256Hex(readFileSync(exportedManifest))) {
    throw new Error(`The release export's ${MANIFEST_FILE} is not the one ${builtManifest} holds. Run \`node scripts/build-web.mjs --release --export-only\` after the slice build.`);
  }
  const manifest = JSON.parse(readFileSync(exportedManifest, 'utf8'));
  const indexes = readIndexes(manifest, directory);
  const problems = manifestProblems(manifest, family => indexes.get(family.id) ?? { family: '', slices: [] });
  if (problems.length > 0) throw new Error(`The font slice manifest is not consistent:\n  ${problems.slice(0, 10).join('\n  ')}`);

  mkdirSync(cacheDirectory, { recursive: true });
  const objects = [];
  for (const object of manifestObjects(manifest, family => indexes.get(family.id) ?? { family: '', slices: [] })) {
    const file = objectFile(directory, object.path);
    if (!existsSync(file) || statSync(file).size !== object.bytes) throw new Error(`${file} is not the ${object.bytes} bytes the manifest names`);
    const bytes = readFileSync(file);
    if (sha256Hex(bytes) !== object.sha256) throw new Error(`${file} is not the file the manifest names (its SHA-256 differs)`);
    const name = object.path.slice(object.path.indexOf('/') + 1);
    const hash = object.path.slice(0, OBJECT_HASH_LENGTH);
    objects.push({ key: objectKey(hash, 'identity'), file, contentType: contentTypeOf(name), bytes: bytes.length, kind: name.endsWith('.index.json') ? 'index' : 'slice' });
    // An index is read by the page on the first character it looks up in the family, and it is 100 to 150 KiB of ranges: the Worker serves a brotli copy of it.
    if (name.endsWith('.index.json')) {
      const copy = await brotliCopyOf(bytes, hash, cacheDirectory);
      objects.push({ key: objectKey(hash, 'br'), file: copy, contentType: 'application/octet-stream', bytes: statSync(copy).size, kind: 'index-br' });
    }
  }
  const slices = objects.filter(object => object.kind === 'slice');
  return {
    manifest,
    objects,
    slices: slices.length,
    indexes: objects.filter(object => object.kind === 'index').length,
    sliceBytes: slices.reduce((total, object) => total + object.bytes, 0),
    bytes: objects.reduce((total, object) => total + object.bytes, 0),
  };
}

/** The bucket keys of every object a font slice manifest names (the slices, the indexes, and the indexes' brotli copies), given a reader for an object by key. */
export function fontSliceKeysOf(manifest, readObjectJson) {
  const keys = [];
  for (const family of manifest.families) {
    const indexKey = keyOfPath(family.index.path);
    keys.push(indexKey, objectKey(family.index.path.slice(0, OBJECT_HASH_LENGTH), 'br'));
    const index = readObjectJson(indexKey);
    if (index === null) continue;
    for (const slice of index.slices) keys.push(keyOfPath(slice.path));
  }
  return keys;
}
