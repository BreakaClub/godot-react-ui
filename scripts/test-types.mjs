import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { argsWithoutEngine, selectEngine } from './engine.mjs';
import { ensureStockTypings } from './typings.mjs';

// The authoritative typecheck. `breaka` (the default) compiles against the tracked `demo/typings`; `stock` against the
// stock editor's declarations (`tsconfig.stock.json`, generated on first use: scripts/typings.mjs), so the project is
// checked against the API of the engine under test.
const root = resolve(import.meta.dirname, '..');
const engine = selectEngine();
const unknown = argsWithoutEngine(process.argv.slice(2));
if (unknown.length > 0) throw new Error(`Unknown argument: ${unknown.join(' ')}`);
if (engine.name === 'stock') ensureStockTypings(engine);
const config = engine.name === 'stock' ? 'tsconfig.stock.json' : 'tsconfig.json';
const result = spawnSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', resolve(root, config)], {cwd: root, stdio: 'inherit'});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
