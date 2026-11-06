import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { importDemo } from './import-demo.mjs';
import { runNativeVerifier } from './native-run.mjs';

const root = resolve(import.meta.dirname, '..');
const godot = process.env.GODOT ?? '/Applications/Godot48.app/Contents/MacOS/Godot';
const deadlineMs = 120_000;
const motion = process.argv.includes('--motion');
const interaction = process.argv.includes('--interaction');
if (motion && interaction) throw new Error('Choose one workflow: --motion or --interaction.');
const successMarker = motion ? 'GODOT_REACT_MOTION_VERIFY_PASSED'
  : interaction ? 'GODOT_REACT_INTERACTION_VERIFY_PASSED' : 'GODOT_REACT_VERIFY_PASSED';
const artifactRoot = motion ? 'artifacts/native-motion' : interaction ? 'artifacts/native-interaction' : 'artifacts/native';
const userFlag = motion ? '--verify-motion' : interaction ? '--verify-interaction' : '--verify';
// `--only=<section>[,<section>]` runs just those sections of the interaction verifier (plan 0.4.1).
const only = process.argv.filter(argument => argument.startsWith('--only='));
if (only.length > 0 && !interaction) throw new Error('--only=<section> applies to the interaction workflow (--interaction).');
// Never launch runtime acceptance against missing or type-invalid JS artifacts.
const build = spawnSync('pnpm', ['build'], {cwd:root, stdio:'inherit'});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
importDemo(godot);
for (const [name, resolution] of [['landscape','1120x800'],['portrait','600x900']]) {
  await runNativeVerifier({
    godot, project: resolve(root, 'demo'), output: resolve(root, artifactRoot, name), name, resolution,
    scriptArgs: [userFlag, ...only], successMarker, deadlineMs,
    errorPattern: /ERROR:|Uncaught|\[panic /u,
  });
}
