import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { selectEngine } from './engine.mjs';
import { startExportServer } from './web-server.mjs';

// Serves the selected engine profile's export (`--engine=stock` / `GODOT_REACT_ENGINE=stock`), in `--release` mode or debug.
const engine = selectEngine();
const mode = engine.webMode();
const root = engine.artifactPath(`web-${mode}`);
// Serving an export is how a Web run starts: refuse one whose side module was built from other sources than the working
// tree (docs/tracks/freshness.md). `--probe` serves the Phase F0 probe export that `build:web --probe` makes.
engine.requireFreshWebExport({ probe: process.argv.includes('--probe') });
if (!statSync(resolve(root, 'index.html')).isFile()) throw new Error('Build the Web demo before serving it.');
const port = Number(process.env.PORT ?? '8096');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1..65535.');
const server = await startExportServer({ root, port });
console.log(`Godot React UI: ${server.url} (${mode}, COOP/COEP enabled)`);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close().then(() => process.exit(0)));
