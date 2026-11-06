import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { importDemo } from './import-demo.mjs';
import { selectEngine } from './engine.mjs';
import { runNativeVerifier } from './native-run.mjs';

const root = resolve(import.meta.dirname, '..');
// The engine profile (`--engine=stock`, `GODOT_REACT_ENGINE=stock`; scripts/engine.mjs) picks the Godot binary,
// the library it must be bound to and the evidence directory.
const engine = selectEngine();
const godot = engine.godot;
// A hang guard, not a budget. The interaction run walks every section and took about 130 s in a quiet landscape window once
// the scroll and inputs sections were both in it (it was killed at 120 s three times, each with an unrelated focus loss in its
// log, which the runner then took for interference and ran again); the others finish well inside two minutes. `sectionMs` in
// the interaction pass line has the numbers.
const INTERACTION_DEADLINE_MS = 300_000;
const DEFAULT_DEADLINE_MS = 120_000;
const motion = process.argv.includes('--motion');
const interaction = process.argv.includes('--interaction');
if (motion && interaction) throw new Error('Choose one workflow: --motion or --interaction.');
const successMarker = motion ? 'GODOT_REACT_MOTION_VERIFY_PASSED'
  : interaction ? 'GODOT_REACT_INTERACTION_VERIFY_PASSED' : 'GODOT_REACT_VERIFY_PASSED';
const artifactRoot = engine.artifactPath(motion ? 'native-motion' : interaction ? 'native-interaction' : 'native');
const deadlineMs = interaction ? INTERACTION_DEADLINE_MS : DEFAULT_DEADLINE_MS;
const userFlag = motion ? '--verify-motion' : interaction ? '--verify-interaction' : '--verify';
// `--only=<section>[,<section>]` runs just those sections of the interaction verifier (plan 0.4.1).
const only = process.argv.filter(argument => argument.startsWith('--only='));
if (only.length > 0 && !interaction) throw new Error('--only=<section> applies to the interaction workflow (--interaction).');
// Fail first if the binary or the installed library belongs to the other engine profile.
engine.prepareNative();
// Never launch runtime acceptance against missing or type-invalid JS artifacts.
const build = spawnSync('pnpm', ['build'], {cwd:root, stdio:'inherit'});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
importDemo(godot);
for (const [name, resolution] of [['landscape','1120x800'],['portrait','600x900']]) {
  await runNativeVerifier({
    godot, project: resolve(root, 'demo'), output: resolve(artifactRoot, name), name, resolution,
    scriptArgs: [userFlag, ...only], successMarker, deadlineMs,
    errorPattern: /ERROR:|Uncaught|\[panic /u,
  });
}
