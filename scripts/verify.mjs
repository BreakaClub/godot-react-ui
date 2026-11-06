import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { importDemo } from './import-demo.mjs';
import { argsWithoutEngine, selectEngine } from './engine.mjs';
import { runNativeVerifier, summarizeRuns } from './native-run.mjs';

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
for (const argument of argsWithoutEngine(process.argv.slice(2))) {
  if (!['--motion', '--interaction', '--no-retry'].includes(argument) && !argument.startsWith('--only=')) throw new Error(`Unknown argument: ${argument}`);
}
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
// `--no-retry` runs each window once, whatever disturbed it: for negative controls, where a re-run would hide the very failure being looked for.
const retry = !process.argv.includes('--no-retry');
if (only.length > 0 && !interaction) throw new Error('--only=<section> applies to the interaction workflow (--interaction).');
// Fail first if the binary or the installed library belongs to the other engine profile.
engine.prepareNative();
// Never launch runtime acceptance against missing or type-invalid JS artifacts.
const build = spawnSync('pnpm', ['build'], {cwd:root, stdio:'inherit'});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
importDemo(godot);
const results = [];
for (const [name, resolution] of [['landscape','1120x800'],['portrait','600x900']]) {
  results.push(await runNativeVerifier({
    godot, project: resolve(root, 'demo'), output: resolve(artifactRoot, name), name, resolution,
    scriptArgs: [userFlag, ...only], successMarker, deadlineMs, retry,
    // The library is checked again before every window, not only before the first: another session may rebuild it in between.
    beforeLaunch: () => engine.requireInstalledLibrary(),
    errorPattern: /ERROR:|Uncaught|\[panic /u,
  }));
}
console.log(`${userFlag.slice(2)} summary:\n${summarizeRuns(results)}`);
