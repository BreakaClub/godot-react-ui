import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants as zlibConstants } from 'node:zlib';
import {
  DOCUMENT_PATH, MAXIMUM_ENCODED_FRACTION, OBJECT_HASH_LENGTH, RELEASE_ID_LENGTH, RELEASE_URL_PREFIX,
  contentTypeOf, isCompressible, objectKey, parseReleaseManifest, releaseKey,
} from '../deploy/release-layout.mjs';

/**
 * Turns the release export (`artifacts/web-release`) into what a deploy uploads (docs/tracks/web-load.md): a manifest naming every file by the
 * hash of its bytes, a brotli copy of each file that gains from one, and the document with a `<base>` that sends the engine's relative loads to
 * this release. Nothing here talks to a network; `scripts/deploy-web.mjs` uploads the result.
 */

const brotli = promisify(brotliCompress);
/** The build receipt says how the export was made, not what the site is; it stays on the build machine. */
const NOT_PUBLISHED = new Set(['build-receipt.json']);
/** Brotli's largest window that every browser's decoder accepts (RFC 7932: 16 MiB less 16 bytes is lgwin 24). */
const BROTLI_WINDOW_BITS = 24;
const BROTLI_SMALLEST_WORTH_ENCODING = 512;

export function hashBytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex').slice(0, OBJECT_HASH_LENGTH);
}

/** The id of a release: a hash of its files' paths and contents (the document before its `<base>` names the id), independent of order. */
export function releaseIdOf(files) {
  const lines = files.map(file => `${file.path}\t${file.hash}`).sort();
  return createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, RELEASE_ID_LENGTH);
}

/**
 * Add `<base href="/r/<id>/">` to the export's page, right after its charset declaration. Every URL the page and the engine build from a relative
 * name (`index.js`, `index.pck`, the side modules, the workers) then resolves inside this release. It must come before any element with a URL.
 */
export function injectBase(html, id) {
  const base = `<base href="${RELEASE_URL_PREFIX}${id}/">`;
  const charset = /<meta\s+charset=[^>]*>/iu.exec(html);
  const head = /<head[^>]*>/iu.exec(html);
  const anchor = charset ?? head;
  if (anchor === null) throw new Error('The export page has neither a charset declaration nor a <head> to put the <base> after');
  const at = anchor.index + anchor[0].length;
  if (/<base\s/iu.test(html)) throw new Error('The export page already has a <base>');
  return `${html.slice(0, at)}\n    ${base}${html.slice(at)}`;
}

/** The files of a release export. The export is flat; a directory means something changed that this script does not know how to publish. */
function listFiles(directory) {
  return readdirSync(directory).sort().flatMap(name => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) throw new Error(`The release export has a directory (${name}); the release layout is flat`);
    return NOT_PUBLISHED.has(name) ? [] : [{ path: name, file: path }];
  });
}

/** The brotli copy of `bytes` (hash `hash`), kept in `cacheDirectory` by content so a second deploy does not compress it again; resolves with the copy's path. */
export async function brotliCopyOf(bytes, hash, cacheDirectory) {
  const cached = join(cacheDirectory, `${hash}.br`);
  if (existsSync(cached)) return cached;
  const encoded = await brotli(bytes, {
    params: {
      [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
      [zlibConstants.BROTLI_PARAM_LGWIN]: BROTLI_WINDOW_BITS,
      [zlibConstants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
    },
  });
  // Written whole or not at all: a copy cut short by an interrupted run must not be found, believed and uploaded by the next.
  const partial = `${cached}.partial`;
  writeFileSync(partial, encoded);
  renameSync(partial, cached);
  return cached;
}

/**
 * Stage `sourceDirectory` as a release. Compressed copies are kept in `cacheDirectory` by the hash of what they encode, so an unchanged engine
 * binary costs nothing on the next deploy.
 *
 * Resolves with the manifest and the objects to upload: `{ key, file, contentType }`, the bytes of each file and, where a brotli copy is smaller
 * than `MAXIMUM_ENCODED_FRACTION` of it, that copy.
 */
export async function buildRelease({ sourceDirectory, cacheDirectory, source = {}, createdAt = new Date().toISOString() }) {
  mkdirSync(cacheDirectory, { recursive: true });
  const listed = listFiles(sourceDirectory);
  const document = listed.find(entry => entry.path === DOCUMENT_PATH);
  if (document === undefined) throw new Error(`The release export has no ${DOCUMENT_PATH}`);
  const documentTemplate = readFileSync(document.file, 'utf8');
  const identity = listed.map(entry => {
    const bytes = readFileSync(entry.file);
    return { ...entry, bytes, hash: hashBytes(bytes) };
  });
  // The document counts as the export wrote it: the id cannot hash a page that has the id in it.
  const id = releaseIdOf(identity);

  const files = [];
  const objects = new Map();
  await Promise.all(identity.map(async entry => {
    const isDocument = entry.path === DOCUMENT_PATH;
    const bytes = isDocument ? Buffer.from(injectBase(documentTemplate, id)) : entry.bytes;
    const hash = isDocument ? hashBytes(bytes) : entry.hash;
    const contentType = contentTypeOf(entry.path);
    let file = entry.file;
    if (isDocument) {
      file = join(cacheDirectory, `${hash}.html`);
      writeFileSync(file, bytes);
    }
    objects.set(objectKey(hash, 'identity'), { key: objectKey(hash, 'identity'), file, contentType });
    const encodings = {};
    // The document stays as it is: it is small, and the Worker's edge compresses it.
    if (!isDocument && isCompressible(entry.path) && bytes.length >= BROTLI_SMALLEST_WORTH_ENCODING) {
      const copy = await brotliCopyOf(bytes, hash, cacheDirectory);
      const copyBytes = statSync(copy).size;
      if (copyBytes <= bytes.length * MAXIMUM_ENCODED_FRACTION) {
        encodings.br = copyBytes;
        objects.set(objectKey(hash, 'br'), { key: objectKey(hash, 'br'), file: copy, contentType: 'application/octet-stream' });
      }
    }
    files.push({ path: entry.path, hash, type: contentType, size: bytes.length, encodings });
  }));
  files.sort((left, right) => (left.path < right.path ? -1 : 1));
  // Through the same check the Worker applies, so a manifest this writes is one it accepts.
  const manifest = parseReleaseManifest({ version: 1, id, createdAt, source, files });
  return { manifest, objects: [...objects.values()], manifestKey: releaseKey(id) };
}
