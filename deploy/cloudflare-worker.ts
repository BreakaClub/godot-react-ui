// The Worker behind https://react.breaka.club (docs/tracks/web-load.md, docs/tracks/web-deploy.md).
//
// A deploy publishes an immutable release to R2 (scripts/deploy-web.mjs) and points `current.json` at it. This Worker serves:
//   /                    the current release's document (`index.html`), revalidated on every visit so a deploy is picked up on the next one
//   /r/<release>/<file>  a file as that release has it. The document's `<base>` points here, so the engine's relative loads (pack, wasm,
//                        scripts, workers) all stay in one release: a page is never half of one release and half of another
//   /o/<hash>/<name>     bytes by content, cached for a year. The large binaries (`.wasm`, `.pck`) answer `/r/...` with a redirect here, so a
//                        binary that did not change between two releases is already in the visitor's cache
// Large files are stored brotli-compressed at deploy time and sent as stored with `Content-Encoding: br` (Cloudflare does not compress
// `application/octet-stream`, which is what the pack is, and its on-the-fly level is below what a deploy can afford). Every response, whatever
// its status, carries the cross-origin isolation headers that SharedArrayBuffer needs.

import {
  DOCUMENT_PATH,
  IMMUTABLE_CACHE_CONTROL,
  OBJECT_HASH_PATTERN,
  OBJECT_URL_PREFIX,
  POINTER_KEY,
  RELEASE_ID_PATTERN,
  RELEASE_URL_PREFIX,
  REVALIDATE_CACHE_CONTROL,
  acceptsEncoding,
  contentTypeOf,
  isCompressible,
  objectKey,
  parsePointer,
  parseReleaseManifest,
  redirectsToObject,
  releaseKey,
  type ReleaseFile,
  type ReleaseManifest,
  type ReleasePointer,
} from './release-layout.mjs';

interface StoredObject {
  readonly body: ReadableStream<Uint8Array>;
  readonly size: number;
  text(): Promise<string>;
}

interface Bucket {
  get(key: string): Promise<StoredObject | null>;
}

export interface Env {
  ASSET_UPLOADS_BUCKET: Bucket;
  REACT_DEMO_R2_PREFIX?: string;
}

/** `encodeBody: 'manual'` says the body is already in the encoding `Content-Encoding` names (the Workers runtime would otherwise encode it again). */
type WorkerResponseInit = ResponseInit & { encodeBody?: 'automatic' | 'manual' };

const DefaultR2Prefix = 'react-demo/v2';
const LandingQuery = '?demo=navigator';
const ManifestCacheLimit = 32;

const CrossOriginIsolatedHeaders: Readonly<Record<string, string>> = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

/** Releases never change once published, so a manifest read once is good for the life of the isolate. */
const manifestCache = new Map<string, ReleaseManifest>();

function headersOf(entries: Readonly<Record<string, string>>): Headers {
  const headers = new Headers(entries);
  for (const [name, value] of Object.entries(CrossOriginIsolatedHeaders)) headers.set(name, value);
  return headers;
}

function plain(status: number, message: string, extra: Readonly<Record<string, string>> = {}): Response {
  return new Response(message, {
    status,
    headers: headersOf({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...extra }),
  });
}

/**
 * What the visitor's browser accepts. Cloudflare rewrites `Accept-Encoding` before a Worker sees it (to `gzip` or `br, gzip`, whatever the browser
 * sent) and keeps the browser's own in `request.cf.clientAcceptEncoding`, which is the header that says whether the browser can decode brotli.
 * Without `cf` (a test, a direct call) the header is the browser's.
 */
function visitorAcceptEncoding(request: Request): string | null {
  const cf: unknown = Reflect.get(request, 'cf');
  if (typeof cf === 'object' && cf !== null) {
    const original: unknown = Reflect.get(cf, 'clientAcceptEncoding');
    if (typeof original === 'string') return original;
  }
  return request.headers.get('accept-encoding');
}

function bucketKey(env: Env, key: string): string {
  const prefix = (env.REACT_DEMO_R2_PREFIX || DefaultR2Prefix).replace(/^\/+|\/+$/g, '');
  return `${prefix}/${key}`;
}

async function loadPointer(env: Env): Promise<ReleasePointer | null> {
  const object = await env.ASSET_UPLOADS_BUCKET.get(bucketKey(env, POINTER_KEY));
  return object === null ? null : parsePointer(JSON.parse(await object.text()));
}

async function loadManifest(env: Env, id: string): Promise<ReleaseManifest | null> {
  const cached = manifestCache.get(id);
  if (cached !== undefined) return cached;
  const object = await env.ASSET_UPLOADS_BUCKET.get(bucketKey(env, releaseKey(id)));
  if (object === null) return null;
  const manifest = parseReleaseManifest(JSON.parse(await object.text()));
  if (manifest.id !== id) throw new Error(`Release ${id} holds a manifest for ${manifest.id}`);
  if (manifestCache.size >= ManifestCacheLimit) {
    const oldest = manifestCache.keys().next();
    if (!oldest.done) manifestCache.delete(oldest.value);
  }
  manifestCache.set(id, manifest);
  return manifest;
}

function fileNamed(manifest: ReleaseManifest, path: string): ReleaseFile | undefined {
  return manifest.files.find(file => file.path === path);
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Whether `If-None-Match` names `etag` (weak comparison, which is what a conditional GET uses). */
function matchesETag(header: string | null, etag: string): boolean {
  if (header === null) return false;
  return header.split(',').some(candidate => {
    const value = candidate.trim().replace(/^W\//, '');
    return value === '*' || value === etag;
  });
}

interface Content {
  readonly hash: string;
  readonly type: string;
  readonly name: string;
  /** Whether a brotli copy exists: known from a manifest, `undefined` when only the address is known, so the copy is tried. */
  readonly brotli: boolean | undefined;
  readonly cacheControl: string;
}

/**
 * The bytes of one object, in the best encoding the request accepts. A stored brotli copy is sent as stored: the browser decodes it as it streams,
 * so the engine's progress (which counts decoded bytes against the export's `fileSizes`) stays right.
 */
async function serveContent(request: Request, env: Env, content: Content): Promise<Response> {
  const acceptsBrotli = content.brotli !== false && isCompressible(content.name) && acceptsEncoding(visitorAcceptEncoding(request), 'br');
  const encoded = acceptsBrotli ? await env.ASSET_UPLOADS_BUCKET.get(bucketKey(env, objectKey(content.hash, 'br'))) : null;
  if (acceptsBrotli && encoded === null && content.brotli === true) {
    throw new Error(`Release lists a brotli copy of ${content.hash} that the bucket does not have`);
  }
  const object = encoded ?? await env.ASSET_UPLOADS_BUCKET.get(bucketKey(env, objectKey(content.hash, 'identity')));
  if (object === null) throw new Error(`The bucket does not have object ${content.hash} (${content.name})`);
  const etag = `"${content.hash}${encoded === null ? '' : '-br'}"`;
  const headers = headersOf({
    'Content-Type': content.type,
    'Cache-Control': content.cacheControl,
    ETag: etag,
    Vary: 'Accept-Encoding',
  });
  if (matchesETag(request.headers.get('if-none-match'), etag)) {
    return new Response(null, { status: 304, headers });
  }
  headers.set('Content-Length', String(object.size));
  if (encoded !== null) {
    headers.set('Content-Encoding', 'br');
    // The bytes are sent as stored. `no-transform` is what Cloudflare documents for "do not alter this response's compression"; the visitor is known to
    // accept br (above), so there is nothing for the edge to convert.
    headers.set('Cache-Control', `${content.cacheControl}, no-transform`);
  }
  const init: WorkerResponseInit = { status: 200, headers, encodeBody: 'manual' };
  return new Response(request.method === 'HEAD' ? null : object.body, init);
}

async function serveDocument(request: Request, env: Env): Promise<Response> {
  const pointer = await loadPointer(env);
  if (pointer === null) return plain(503, 'No release has been published.', { 'Retry-After': '60' });
  const manifest = await loadManifest(env, pointer.release);
  if (manifest === null) throw new Error(`The pointer names release ${pointer.release}, which the bucket does not have`);
  const document = fileNamed(manifest, DOCUMENT_PATH);
  if (document === undefined) throw new Error(`Release ${manifest.id} has no ${DOCUMENT_PATH}`);
  return serveContent(request, env, {
    hash: document.hash, type: document.type, name: DOCUMENT_PATH, brotli: false, cacheControl: REVALIDATE_CACHE_CONTROL,
  });
}

async function serveReleaseFile(request: Request, env: Env, id: string, path: string): Promise<Response> {
  const manifest = await loadManifest(env, id);
  if (manifest === null) return plain(404, 'Not Found');
  const file = fileNamed(manifest, path);
  if (file === undefined) return plain(404, 'Not Found');
  if (redirectsToObject(file.path)) {
    return new Response(null, {
      status: 302,
      headers: headersOf({ Location: `${OBJECT_URL_PREFIX}${file.hash}/${basename(file.path)}`, 'Cache-Control': IMMUTABLE_CACHE_CONTROL }),
    });
  }
  return serveContent(request, env, {
    hash: file.hash, type: file.type, name: file.path, brotli: file.encodings.br !== undefined, cacheControl: IMMUTABLE_CACHE_CONTROL,
  });
}

function serveObject(request: Request, env: Env, hash: string, name: string): Promise<Response> {
  return serveContent(request, env, {
    hash, type: contentTypeOf(name), name, brotli: undefined, cacheControl: IMMUTABLE_CACHE_CONTROL,
  });
}

async function route(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return plain(405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
  const url = new URL(request.url);

  if (url.pathname === '/' && url.search === '') {
    return new Response(null, { status: 302, headers: headersOf({ Location: `/${LandingQuery}`, 'Cache-Control': 'no-store' }) });
  }
  if (url.pathname === '/' || url.pathname === `/${DOCUMENT_PATH}`) return serveDocument(request, env);

  if (url.pathname.startsWith(RELEASE_URL_PREFIX)) {
    const rest = url.pathname.slice(RELEASE_URL_PREFIX.length);
    const slash = rest.indexOf('/');
    const id = slash < 0 ? rest : rest.slice(0, slash);
    if (slash < 0 || !RELEASE_ID_PATTERN.test(id)) return plain(404, 'Not Found');
    return serveReleaseFile(request, env, id, rest.slice(slash + 1));
  }

  if (url.pathname.startsWith(OBJECT_URL_PREFIX)) {
    const [hash, name, ...extra] = url.pathname.slice(OBJECT_URL_PREFIX.length).split('/');
    if (hash === undefined || name === undefined || extra.length > 0 || !OBJECT_HASH_PATTERN.test(hash) || name === '') return plain(404, 'Not Found');
    return serveObject(request, env, hash, name);
  }

  return plain(404, 'Not Found');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      // Logged for the Worker's observability, and a 500 for the visitor: a release that does not hold together must not be served as a 404.
      console.error(`${request.method} ${request.url}: ${error instanceof Error ? error.message : String(error)}`);
      return plain(500, 'The site could not serve this request.');
    }
  },
};
