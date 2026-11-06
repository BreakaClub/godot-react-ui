import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { selectEngine } from './engine.mjs';

const mode = process.argv.includes('--release') ? 'release' : 'debug';
// Serves the selected engine profile's export (`--engine=stock` / `GODOT_REACT_ENGINE=stock`).
const root = selectEngine().artifactPath(`web-${mode}`);
if (!statSync(resolve(root, 'index.html')).isFile()) throw new Error('Build the Web demo before serving it.');
const port = Number(process.env.PORT ?? '8096');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1..65535.');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

const server = createServer((request, response) => {
  // SharedArrayBuffer/pthreads require a cross-origin-isolated page. Localhost
  // is a trustworthy context; remote hosting must additionally use HTTPS.
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
server.listen(port, '127.0.0.1', () => console.log(`Godot React UI: http://127.0.0.1:${port} (${mode}, COOP/COEP enabled)`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
