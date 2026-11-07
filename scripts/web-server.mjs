import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
/** Where the site serves content-addressed objects from (`deploy/release-layout.mjs`, `OBJECT_URL_PREFIX`); the font slices are hosted there. */
const OBJECT_URL_PREFIX = '/o/';
const LOOPBACK = '127.0.0.1';

/**
 * Serve the Web export in `root` on the loopback interface: `port` 0 asks the system for a free one. The headers make the page
 * cross-origin isolated, which SharedArrayBuffer and the engine's pthreads need (localhost is a trustworthy context; remote
 * hosting must additionally use HTTPS). Resolves when it is listening, with its URL and a `close` that ends open connections.
 *
 * `landing` is a query string (`?demo=navigator`) that a request for the bare address `/` is sent to. The export's own page opens the
 * single-page playground at the bare address, because that is what the Web verifiers load (demo/src/launch.ts); the demo server for
 * a person (`pnpm demo:web`) gives the bare address a landing, and the verifiers' servers give it none.
 *
 * `objects` is a directory laid out as `<hash>/<name>`, served at `/o/<hash>/<name>` as the deployed site serves its objects: the font slices
 * (`scripts/build-font-slices.mjs`, docs/tracks/font-slices.md), which are not part of the export.
 */
export async function startExportServer({ root, port = 0, landing, objects }) {
  /** What was asked of `objects`, in order: a verifier counts the bytes a page fetched here, and that a page without the feature fetched none. */
  const objectRequests = [];
  const server = createServer((request, response) => {
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.setHeader('Cache-Control', 'no-store');
    /** The path of a request for an object, once it is known to be one. */
    let objectPath;
    try {
      const address = new URL(request.url ?? '/', 'http://localhost');
      const pathname = decodeURIComponent(address.pathname);
      if (landing !== undefined && pathname === '/' && address.search === '') {
        response.writeHead(302, { Location: `/${landing}` }).end();
        return;
      }
      const fromObjects = objects !== undefined && pathname.startsWith(OBJECT_URL_PREFIX);
      if (fromObjects) objectPath = pathname;
      const base = fromObjects ? resolve(objects) : root;
      const path = resolve(base, fromObjects ? `.${pathname.slice(OBJECT_URL_PREFIX.length - 1)}` : `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!path.startsWith(base + sep) || !['GET', 'HEAD'].includes(request.method ?? '')) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const stat = statSync(path);
      if (!stat.isFile()) { response.writeHead(404).end('Not found'); return; }
      if (fromObjects) objectRequests.push({ path: pathname, method: request.method ?? 'GET', bytes: stat.size, missing: false });
      response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Content-Length': stat.size });
      if (request.method === 'HEAD') response.end();
      else createReadStream(path).on('error', error => response.destroy(error)).pipe(response);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        if (objectPath !== undefined) objectRequests.push({ path: objectPath, method: request.method ?? 'GET', bytes: 0, missing: true });
        response.writeHead(404).end('Not found');
      } else { console.error(error); response.writeHead(400).end('Invalid request'); }
    }
  });
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(port, LOOPBACK, resolvePromise);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('The export server has no TCP address');
  return {
    server, port: address.port, url: `http://${LOOPBACK}:${address.port}/`, objectRequests,
    close: () => new Promise(resolvePromise => { server.close(() => resolvePromise()); server.closeAllConnections(); }),
  };
}
