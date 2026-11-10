import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
import { DEMO_ENTRY_POINTS } from './demo-entry-points.mjs';

rejectUnknownArguments(process.argv.slice(2));

const root = resolve(import.meta.dirname, '..');
const shared = {
  absWorkingDir: root, bundle: true, platform: 'neutral', target: 'es2022',
  sourcemap: true, format: 'cjs', external: ['godot', 'godot.lib.api', 'godot.annotations', 'godot-jsb'],
  conditions: ['browser'],
  // A package without an `exports` map is found by its `module` or `main`: the neutral platform reads no main fields of its own, and
  // abort-controller's event-target-shim has only `main`. Every bundle was made from the same files with these as without them.
  mainFields: ['module', 'main'],
  define: {
    'process.env.NODE_ENV': '"production"',
    'self': 'globalThis',
  },
};
await build({...shared, entryPoints: [...DEMO_ENTRY_POINTS], outdir: 'demo/.godot/GodotJS/src'});
await build({...shared, entryPoints: ['src/index.ts'], outfile: 'dist/index.js', external: [...shared.external, 'react', 'react/*', 'react-reconciler', 'react-reconciler/constants']});
await build({
  ...shared, format: 'esm', entryPoints: ['src/index.ts'], outfile: 'dist/index.mjs',
  external: [...shared.external, 'react', 'react/*', 'react-reconciler'],
  plugins: [{
    name: 'node-esm-constants',
    setup(builder) {
      // react-reconciler has no exports map; Node ESM requires its .js extension.
      builder.onResolve({filter: /^react-reconciler\/constants$/}, () => ({
        path: 'react-reconciler/constants.js', external: true,
      }));
    },
  }],
});
const types = spawnSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.package.json'], {cwd:root, stdio:'inherit'});
if (types.error) throw types.error;
if (types.status !== 0) process.exit(types.status ?? 1);

// The package is also loaded where there is no Godot: a project's unit tests in Node use its style compiler. Both builds have to load there,
// with none of GodotJS's modules to be found (src/godot-host.ts loads `godot.lib.api` when a root is first handed over, not before).
const usesTheCompiler = 'if (typeof compileStyle(\'p-4\') !== \'object\') throw new Error(\'compileStyle did not compile\');';
const loadsInNode = {
  'dist/index.js': ['-e', `const { compileStyle } = require('./dist/index.js'); ${usesTheCompiler}`],
  'dist/index.mjs': ['--input-type=module', '-e', `const { compileStyle } = await import('./dist/index.mjs'); ${usesTheCompiler}`],
};
for (const [built, args] of Object.entries(loadsInNode)) {
  const loaded = spawnSync(process.execPath, args, {cwd:root, stdio:'inherit'});
  if (loaded.error) throw loaded.error;
  if (loaded.status !== 0) {
    console.error(`${built} does not load in Node without Godot.`);
    process.exit(loaded.status ?? 1);
  }
}
