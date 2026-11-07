// What the Worker (deploy/cloudflare-worker.ts) and the deploy script (scripts/deploy-web.mjs) must agree on: where a release lives in the
// bucket, what its manifest says, which encoding a request gets. One module, so the two cannot drift (docs/tracks/web-load.md).
//
// Layout below the bucket prefix (`REACT_DEMO_R2_PREFIX`, `react-demo/v2`):
//   current.json              the pointer: which release the site shows, and the releases before it
//   releases/<id>.json        a release's manifest: its files, each named by the hash of its bytes
//   objects/<hash>            the bytes of a file; objects/<hash>.br is the same bytes brotli-compressed
// A release id is a hash of its contents, so publishing the same files twice is the same release, and an object is never rewritten with other
// bytes. Both are immutable; only the pointer changes, and it is one object, so a deploy and a rollback are each one atomic write.

export const POINTER_KEY = 'current.json';
/** The site's document: the Godot export's page, served at `/`. It is the only file addressed by name. */
export const DOCUMENT_PATH = 'index.html';
/** `/r/<release id>/<path>`: a file as one release has it. The document's `<base>` points here, so the engine's relative loads stay in one release. */
export const RELEASE_URL_PREFIX = '/r/';
/** `/o/<hash>/<name>`: bytes by content. The large binaries redirect here, so a file that did not change between releases is not downloaded again. */
export const OBJECT_URL_PREFIX = '/o/';
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
export const REVALIDATE_CACHE_CONTROL = 'no-cache';
/** How many releases the pointer remembers for rollback. */
export const POINTER_HISTORY_LENGTH = 20;
/** A brotli copy is stored only when it is at most this fraction of the original: below that the saving is not worth a decode. */
export const MAXIMUM_ENCODED_FRACTION = 0.95;
export const RELEASE_ID_LENGTH = 12;
export const OBJECT_HASH_LENGTH = 32;

export const RELEASE_ID_PATTERN = /^[0-9a-f]{12}$/u;
export const OBJECT_HASH_PATTERN = /^[0-9a-f]{32}$/u;

const CONTENT_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.pck', 'application/octet-stream'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  // The font slices (docs/tracks/font-slices.md). A woff2 file is brotli-compressed already, so it is not in COMPRESSIBLE_EXTENSIONS.
  ['.woff2', 'font/woff2'],
]);
/** Types worth a brotli copy; an image is already compressed. */
const COMPRESSIBLE_EXTENSIONS = new Set(['.html', '.js', '.json', '.wasm', '.pck', '.svg', '.txt']);
/**
 * The binaries that redirect to their object URL. A script cannot: a worker started from a redirected script takes the final URL as its base, and the
 * engine's relative loads from a worker would then miss. Scripts are small next to these.
 */
const REDIRECTED_EXTENSIONS = new Set(['.wasm', '.pck']);

export function extensionOf(path) {
  const dot = path.lastIndexOf('.');
  return dot < 0 ? '' : path.slice(dot).toLowerCase();
}

export function contentTypeOf(path) {
  return CONTENT_TYPES.get(extensionOf(path)) ?? 'application/octet-stream';
}

export function isCompressible(path) {
  return COMPRESSIBLE_EXTENSIONS.has(extensionOf(path));
}

export function redirectsToObject(path) {
  return REDIRECTED_EXTENSIONS.has(extensionOf(path));
}

export function releaseKey(id) {
  return `releases/${id}.json`;
}

/** `encoding` is `identity` for the file's own bytes, or a stored encoding such as `br`. */
export function objectKey(hash, encoding) {
  return encoding === 'identity' ? `objects/${hash}` : `objects/${hash}.${encoding}`;
}

/**
 * Whether `Accept-Encoding` allows `encoding` (RFC 9110 12.5.3): named with a quality above 0, or covered by `*` when it is not named.
 * Only the encodings this site stores are asked about, so a token it does not know is not an error.
 */
export function acceptsEncoding(header, encoding) {
  if (header === null || header === undefined) return false;
  let wildcard = 0;
  for (const part of header.split(',')) {
    const [token = '', ...parameters] = part.trim().split(';');
    let quality = 1;
    for (const parameter of parameters) {
      const [name, value] = parameter.trim().split('=');
      if (name?.trim().toLowerCase() === 'q') quality = Number(value);
    }
    if (Number.isNaN(quality)) continue;
    const name = token.trim().toLowerCase();
    if (name === encoding) return quality > 0;
    if (name === '*') wildcard = quality;
  }
  return wildcard > 0;
}

function fail(message) {
  throw new Error(`Invalid release data: ${message}`);
}

function record(value, what) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`${what} is not an object`);
  return value;
}

function text(value, what) {
  if (typeof value !== 'string' || value === '') fail(`${what} is not a non-empty string`);
  return value;
}

function count(value, what) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) fail(`${what} is not a non-negative integer`);
  return value;
}

/** Check parsed JSON against the manifest shape and return it typed; the Worker and the deploy script read a manifest only through this. */
export function parseReleaseManifest(value) {
  const manifest = record(value, 'the manifest');
  if (manifest.version !== 1) fail(`manifest version ${String(manifest.version)} is not 1`);
  const id = text(manifest.id, 'the release id');
  if (!RELEASE_ID_PATTERN.test(id)) fail(`release id "${id}" is not ${RELEASE_ID_LENGTH} hex digits`);
  if (!Array.isArray(manifest.files)) fail('files is not an array');
  const files = manifest.files.map((entry, index) => {
    const file = record(entry, `file ${index}`);
    const path = text(file.path, `file ${index} path`);
    const hash = text(file.hash, `${path} hash`);
    if (!OBJECT_HASH_PATTERN.test(hash)) fail(`${path} hash "${hash}" is not ${OBJECT_HASH_LENGTH} hex digits`);
    const encodings = record(file.encodings, `${path} encodings`);
    const encodedBytes = {};
    for (const [name, size] of Object.entries(encodings)) {
      if (name !== 'br') fail(`${path} has an encoding "${name}" this site does not serve`);
      encodedBytes[name] = count(size, `${path} ${name} size`);
    }
    return { path, hash, type: text(file.type, `${path} type`), size: count(file.size, `${path} size`), encodings: encodedBytes };
  });
  if (new Set(files.map(file => file.path)).size !== files.length) fail('a path is listed twice');
  if (!files.some(file => file.path === DOCUMENT_PATH)) fail(`the release has no ${DOCUMENT_PATH}`);
  const source = manifest.source === undefined ? {} : record(manifest.source, 'source');
  return { version: 1, id, createdAt: text(manifest.createdAt, 'createdAt'), source, files };
}

/** Check parsed JSON against the pointer shape and return it typed. */
export function parsePointer(value) {
  const pointer = record(value, 'the pointer');
  if (pointer.version !== 1) fail(`pointer version ${String(pointer.version)} is not 1`);
  const release = text(pointer.release, 'the current release');
  if (!RELEASE_ID_PATTERN.test(release)) fail(`current release "${release}" is not ${RELEASE_ID_LENGTH} hex digits`);
  if (!Array.isArray(pointer.history)) fail('history is not an array');
  const history = pointer.history.map((entry, index) => {
    const item = record(entry, `history ${index}`);
    const id = text(item.release, `history ${index} release`);
    if (!RELEASE_ID_PATTERN.test(id)) fail(`history ${index} release "${id}" is not ${RELEASE_ID_LENGTH} hex digits`);
    return { release: id, deployedAt: text(item.deployedAt, `history ${index} deployedAt`) };
  });
  const workerSha256 = pointer.workerSha256 === undefined ? undefined : text(pointer.workerSha256, 'workerSha256');
  return { version: 1, release, deployedAt: text(pointer.deployedAt, 'deployedAt'), workerSha256, history };
}
