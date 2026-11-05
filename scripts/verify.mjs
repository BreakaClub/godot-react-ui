import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importDemo } from './import-demo.mjs';

const root = resolve(import.meta.dirname, '..');
const godot = process.env.GODOT ?? '/Applications/Godot48.app/Contents/MacOS/Godot';
const deadlineMs = 120_000;
const motion = process.argv.includes('--motion');
const successMarker = motion ? 'GODOT_REACT_MOTION_VERIFY_PASSED' : 'GODOT_REACT_VERIFY_PASSED';
// Never launch runtime acceptance against missing or type-invalid JS artifacts.
const build = spawnSync('pnpm', ['build'], {cwd:root, stdio:'inherit'});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
importDemo(godot);
for (const [name, resolution] of [['landscape','1120x800'],['portrait','600x900']]) {
  const output = resolve(root,motion ? 'artifacts/native-motion' : 'artifacts/native',name);
  mkdirSync(output,{recursive:true});
  const child = spawn(godot,['--audio-driver','Dummy','--path',resolve(root,'demo'),'--resolution',resolution,'--',motion ? '--verify-motion' : '--verify'],{
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
    throw new Error(`${name} runtime verification failed (exit ${code}); see ${output}/run.log`);
  }
  const duringWorkflow = log.split(successMarker)[0];
  if (/ERROR:|Uncaught|\[panic /u.test(duringWorkflow)) {
    throw new Error(`${name} emitted a runtime error before completion; see ${output}/run.log`);
  }
  if (code !== 0) console.warn(`Runtime assertions passed; teardown exited ${code}. Evidence retained.`);
}
