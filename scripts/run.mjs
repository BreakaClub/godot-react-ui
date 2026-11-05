import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { importDemo } from './import-demo.mjs';

const godot = process.env.GODOT ?? '/Applications/Godot48.app/Contents/MacOS/Godot';
importDemo(godot);
const child = spawn(godot, ['--audio-driver', 'Dummy', '--path', resolve(import.meta.dirname, '../demo'), ...process.argv.slice(2)], {stdio:'inherit'});
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
