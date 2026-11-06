import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { context } from 'esbuild';
import { selectEngine } from './engine.mjs';

const root = resolve(import.meta.dirname, '..');
const builder = await context({
  absWorkingDir: root, bundle: true, platform: 'neutral', target: 'es2022', format: 'cjs', sourcemap:true,
  entryPoints: ['demo/src/main.ts', 'demo/src/verify.ts', 'demo/src/verify-motion.ts', 'demo/src/app.tsx'], outdir: 'demo/.godot/GodotJS/src',
  external: ['godot', 'godot.lib.api', 'godot.annotations', 'godot-jsb'],
  define: {'process.env.NODE_ENV':'"development"'},
});
await builder.watch();
const engine = selectEngine();
const godot = engine.godot;
engine.prepareNative();
const child = spawn(godot, ['--audio-driver','Dummy','--editor','--path',resolve(root,'demo')],{stdio:'inherit'});
child.on('error', async error => {console.error(error); await builder.dispose(); process.exitCode=1;});
child.on('exit', async code => {await builder.dispose(); process.exitCode=code??1;});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
