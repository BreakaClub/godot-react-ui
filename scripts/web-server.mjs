import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const LOOPBACK = '127.0.0.1';

/**
 * Serve the Web export in `root` on the loopback interface: `port` 0 asks the system for a free one. The headers make the page
 * cross-origin isolated, which SharedArrayBuffer and the engine's pthreads need (localhost is a trustworthy context; remote
 * hosting must additionally use HTTPS). Resolves when it is listening, with its URL and a `close` that ends open connections.
 */
export async function startExportServer({ root, port = 0 }) {
  const server = createServer((request, response) => {
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.setHeader('Cache-Control', 'no-store');
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!path.startsWith(root + sep) || !['GET', 'HEAD'].includes(request.method ?? '')) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const stat = statSync(path);
      if (!stat.isFile()) { response.writeHead(404).end('Not found'); return; }
      response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Content-Length': stat.size });
      if (request.method === 'HEAD') response.end();
      else createReadStream(path).on('error', error => response.destroy(error)).pipe(response);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') response.writeHead(404).end('Not found');
      else { console.error(error); response.writeHead(400).end('Invalid request'); }
    }
  });
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(port, LOOPBACK, resolvePromise);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('The export server has no TCP address');
  return {
    server, port: address.port, url: `http://${LOOPBACK}:${address.port}/`,
    close: () => new Promise(resolvePromise => { server.close(() => resolvePromise()); server.closeAllConnections(); }),
  };
}
