import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const shared = {
  absWorkingDir: root, bundle: true, platform: 'neutral', target: 'es2022',
  sourcemap: true, format: 'cjs', external: ['godot', 'godot.lib.api', 'godot.annotations', 'godot-jsb'],
  define: { 'process.env.NODE_ENV': '"development"' },
};
await build({...shared, entryPoints: ['demo/src/main.ts', 'demo/src/verify.ts', 'demo/src/verify-motion.ts', 'demo/src/verify-interaction.ts', 'demo/src/probe.ts', 'demo/src/app.tsx'], outdir: 'demo/.godot/GodotJS/src'});
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
// The world-space scene (docs/WORLD_SPACE.md) has its own owner; its bundles are separate entry points. The
// Web export needs a compiled module for every demo `.ts` file, so `world-geometry.ts` is one too.
await build({...shared, entryPoints: ['demo/src/world-main.ts', 'demo/src/world-geometry.ts', 'demo/src/verify-world.ts', 'demo/src/scene-launcher.ts'], outdir: 'demo/.godot/GodotJS/src'});
const types = spawnSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.package.json'], {cwd:root, stdio:'inherit'});
if (types.error) throw types.error;
if (types.status !== 0) process.exit(types.status ?? 1);
