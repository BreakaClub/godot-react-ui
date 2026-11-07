import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
import { selectEngine } from './engine.mjs';
import { FONT_SLICE_OBJECTS_DIRECTORY } from './font-slices/paths.mjs';
import { startExportServer } from './web-server.mjs';

// `pnpm demo:web`: serves the selected engine profile's export (`--engine=stock` / `GODOT_REACT_ENGINE=stock`), in `--release` mode or
// debug, and prints the address of the lab navigator. `--lab=<id>` makes that address open a lab. The bare address `/` goes to the
// navigator here (the export's own page opens the single-page playground the Web verifiers drive, demo/src/launch.ts).
rejectUnknownArguments(process.argv.slice(2), { flags: ['--release', '--probe'], prefixes: ['--lab='] });
const engine = selectEngine();
const mode = engine.webMode();
const root = engine.artifactPath(`web-${mode}`);
const lab = process.argv.find((argument) => argument.startsWith('--lab='))?.slice('--lab='.length);
if (lab === '') throw new Error('--lab= needs the id of a lab');
const landing = lab === undefined ? '?demo=navigator' : `?lab=${encodeURIComponent(lab)}`;
// Serving an export is how a Web run starts: refuse one whose side module was built from other sources than the working
// tree (docs/tracks/freshness.md). `--probe` serves the Phase F0 probe export that `build:web --probe` makes.
try {
  engine.requireFreshWebExport({ probe: process.argv.includes('--probe') });
} catch (error) {
  // The message names what is stale and the command that fixes it; a stack trace would only bury it.
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
if (!statSync(resolve(root, 'index.html')).isFile()) throw new Error('Build the Web demo before serving it.');
// 8096 so that the address is the same from one day to the next; a free port when it is taken (or when PORT says otherwise, exactly that one).
const DEFAULT_PORT = 8096;
const named = process.env.PORT;
const port = named === undefined ? DEFAULT_PORT : Number(named);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1..65535.');
let server;
try {
  server = await startExportServer({ root, port, landing, objects: FONT_SLICE_OBJECTS_DIRECTORY });
} catch (error) {
  if (named !== undefined || !(error instanceof Error) || error.code !== 'EADDRINUSE') throw error;
  console.log(`Port ${port} is in use; taking a free one.`);
  server = await startExportServer({ root, port: 0, landing, objects: FONT_SLICE_OBJECTS_DIRECTORY });
}
console.log(`Godot React UI lab navigator: ${server.url}${landing === '?demo=navigator' ? '' : landing} (${mode}, COOP/COEP enabled; Ctrl+C stops it)`);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close().then(() => process.exit(0)));
