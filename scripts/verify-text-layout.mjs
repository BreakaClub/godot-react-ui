import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { selectEngine } from './engine.mjs';
import { importDemo } from './import-demo.mjs';

// Text layout probe (docs/tracks/text-layout.md): caret, hit-test and selection geometry against a running
// Godot. It needs a probe build of the extension (`pnpm build:native --probe`; restore a default
// `pnpm build:native` afterwards). The probe takes no input: it reads geometry and draws, so the window
// only has to exist. `--headless` skips the pixel checks and the captures.
const root = resolve(import.meta.dirname, '..');
const engine = selectEngine();
const godot = engine.godot;
const deadlineMs = 120_000;
const scene = 'res://text-layout-probe.tscn';
const successMarker = 'GODOT_REACT_TEXT_LAYOUT_VERIFY_PASSED';
const headless = process.argv.includes('--headless');
const output = engine.artifactPath('native-text-layout');
// Fail first if the binary or the installed library belongs to the other engine profile.
engine.prepareNative({probe: true});
// Never launch runtime acceptance against missing or type-invalid JS artifacts.
const build = spawnSync('pnpm', ['build'], {cwd:root, stdio:'inherit'});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
importDemo(godot);
mkdirSync(output,{recursive:true});
const child = spawn(godot,[...(headless ? ['--headless'] : []),'--audio-driver','Dummy','--path',resolve(root,'demo'),'--resolution','1120x800',scene,'--','--verify-text-layout'],{
  env:{...process.env,GODOT_REACT_ARTIFACTS:output},stdio:['ignore','pipe','pipe'],
});
let log = '';
const collect = data => {const value=data.toString();log+=value;process.stdout.write(value);};
child.stdout.on('data',collect);child.stderr.on('data',collect);
const timer = setTimeout(()=>child.kill('SIGTERM'),deadlineMs);
const code = await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});
clearTimeout(timer);
writeFileSync(resolve(output,'run.log'),log);
if (!log.includes(successMarker) || log.includes('GODOT_REACT_VERIFY_FAILED')) {
  throw new Error(`text layout verification failed (exit ${code}); see ${output}/run.log`);
}
const duringWorkflow = log.split(successMarker)[0];
if (/ERROR:|Uncaught|\[panic /u.test(duringWorkflow)) {
  throw new Error(`text layout verification emitted a runtime error before completion; see ${output}/run.log`);
}
if (code !== 0) console.warn(`Runtime assertions passed; teardown exited ${code}. Evidence retained.`);
