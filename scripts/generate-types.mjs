import { spawnSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { scrubOpenScripts } from './editor-session.mjs';
import { argsWithoutEngine, selectEngine } from './engine.mjs';
import { generateStockTypings } from './typings.mjs';
import { GDEXTENSION_FILE } from './live-compile-build.mjs';

// `breaka` (the default) lets Breaka's editor write `demo/typings` and `demo/gen`, which are tracked. `stock` leaves
// them alone and writes the stock editor's declarations to `target/stock-typings/typings` (scripts/typings.mjs).
const root = resolve(import.meta.dirname, '..');
const engine = selectEngine();
const godot = engine.godot;
const unknown = argsWithoutEngine(process.argv.slice(2));
if (unknown.length > 0) throw new Error(`Unknown argument: ${unknown.join(' ')}`);
// The default profile's editor writes the tracked typings from the installed library, so refuse a stale one before any
// work; the stock profile generates from its target directory's library, which `generateStockTypings` checks. The live-compile extension is
// taken out of the project below while the editor runs, so a stale one is no reason to refuse.
if (engine.name !== 'stock') engine.prepareNative({ liveCompile: false });
const build = spawnSync('pnpm', ['build'], {cwd:root, stdio:'inherit', timeout:120_000});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
if (engine.name === 'stock') {
  generateStockTypings(engine);
} else {
  // The editor rewrites a TypeScript file it has open (scripts/editor-session.mjs).
  scrubOpenScripts(resolve(root, 'demo'));
  // The live-compile extension is optional (docs/tracks/live-compile.md): the tracked typings must not describe a class a checkout
  // without it lacks, so its manifest is out of the project while the editor writes them.
  const hidden = `${GDEXTENSION_FILE}.hidden`;
  const hideExtension = existsSync(GDEXTENSION_FILE);
  if (hideExtension) renameSync(GDEXTENSION_FILE, hidden);
  let result;
  try {
    result = spawnSync(godot, ['--headless', '--audio-driver', 'Dummy', '--editor', '--generate-types', '--path', resolve(root, 'demo')], {cwd:root, stdio:'inherit', timeout:120_000});
  } finally {
    if (hideExtension) renameSync(hidden, GDEXTENSION_FILE);
  }
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
