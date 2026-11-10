import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { context } from 'esbuild';
import { rejectUnknownArguments } from './arguments.mjs';
import { DEMO_ENTRY_POINTS } from './demo-entry-points.mjs';
import { scrubOpenScripts } from './editor-session.mjs';
import { selectEngine } from './engine.mjs';

rejectUnknownArguments(process.argv.slice(2));
const root = resolve(import.meta.dirname, '..');
const engine = selectEngine();
const godot = engine.godot;
// Checked once, at startup, before the watcher or the editor exist: the library the editor loads must be a build of the
// current sources. Not policed afterwards: the running editor has its library mapped and a rebuild is a restart
// (F9).
engine.prepareNative();
// An interactive editor restores the scripts of the last session, and Godot's script editor rewrites a TypeScript file it has open.
// Open TypeScript in an external editor (README).
scrubOpenScripts(resolve(root, 'demo'));
const builder = await context({
  absWorkingDir: root, bundle: true, platform: 'neutral', target: 'es2022', format: 'cjs', sourcemap:true,
  entryPoints: [...DEMO_ENTRY_POINTS], outdir: 'demo/.godot/GodotJS/src',
  external: ['godot', 'godot.lib.api', 'godot.annotations', 'godot-jsb'],
  conditions: ['browser'],
  // A package without an `exports` map is found by its `module` or `main`: the neutral platform reads no main fields of its own, and
  // abort-controller's event-target-shim has only `main`. Every bundle was made from the same files with these as without them.
  mainFields: ['module', 'main'],
  define: {
    'process.env.NODE_ENV': '"development"',
    'self': 'globalThis',
  },
});
await builder.watch();
const child = spawn(godot, ['--audio-driver','Dummy','--editor','--path',resolve(root,'demo')],{stdio:'inherit'});
child.on('error', async error => {console.error(error); await builder.dispose(); process.exitCode=1;});
child.on('exit', async code => {await builder.dispose(); process.exitCode=code??1;});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
