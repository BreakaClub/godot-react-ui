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
