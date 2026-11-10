import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { demoArguments } from './demo-arguments.mjs';
import { argsWithoutEngine, selectEngine } from './engine.mjs';
import { importDemo } from './import-demo.mjs';

// `pnpm demo` opens the interactive demo, so it needs the default build of the library: a probe or faults build is refused on
// purpose. The evidence probe is run with a probe build and Godot directly (`$GODOT --path demo -- --probe`).
// Every argument but `--engine=` goes to Godot as it is written (Godot decides what it takes; user arguments follow `--`), so
// this script is the one that does not reject arguments it does not know. The demo's own arguments (`--lab=<id>` opens a lab,
// `--demo=app` the single-page playground) belong after `--`; given without it they are moved there, so `pnpm demo --lab=glass` works.
const engine = selectEngine();
const godot = engine.godot;
engine.prepareNative();
importDemo(godot);
const child = spawn(godot, ['--audio-driver', 'Dummy', '--path', resolve(import.meta.dirname, '../demo'), ...demoArguments(argsWithoutEngine(process.argv.slice(2)))], {stdio:'inherit'});
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
