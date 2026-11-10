import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { importDemo } from './import-demo.mjs';
import { argsWithoutEngine, selectEngine } from './engine.mjs';
import {
  NATIVE_INTERACTION_SECTIONS, NATIVE_OPT_IN_SECTIONS, checkSectionNames, interactionDeadlineMs, requestedSections, sectionsToRun,
} from './verifier-sections.mjs';
import { runNativeVerifiers, summarizeRuns } from './native-run.mjs';
import { isInstalled as isGodotTscInstalled, requireGodotTsc } from './godot-tsc.mjs';

const root = resolve(import.meta.dirname, '..');
// The engine profile (`--engine=stock`, `GODOT_REACT_ENGINE=stock`; scripts/engine.mjs) picks the Godot binary,
// the library it must be bound to and the evidence directory.
const engine = selectEngine();
const godot = engine.godot;
// A hang guard, not a budget. The interaction run's grows with its sections (`interactionDeadlineMs` in scripts/verifier-sections.mjs, with
// the measurements); the other workflows finish well inside two minutes. `sectionMs` in the interaction pass line has the numbers.
const DEFAULT_DEADLINE_MS = 120_000;
for (const argument of argsWithoutEngine(process.argv.slice(2))) {
  if (!['--motion', '--interaction', '--no-retry', '--faults', '--serial'].includes(argument)
    && !['--only=', '--renderer=', '--viewport=', '--lab='].some(prefix => argument.startsWith(prefix))) throw new Error(`Unknown argument: ${argument}`);
}
const motion = process.argv.includes('--motion');
const interaction = process.argv.includes('--interaction');
if (motion && interaction) throw new Error('Choose one workflow: --motion or --interaction.');
const successMarker = motion ? 'GODOT_REACT_MOTION_VERIFY_PASSED'
  : interaction ? 'GODOT_REACT_INTERACTION_VERIFY_PASSED' : 'GODOT_REACT_VERIFY_PASSED';
// `--renderer=<gl_compatibility|mobile|forward_plus>` runs the windows on that rendering method (Godot's `--rendering-method`); the
// project's own is Compatibility. `--viewport=WxH` runs one window whose render target is that size whatever the window's (the
// demo's `--logical-viewport`), for a size the two windows below are not. Each has its own evidence directory.
const RENDERERS = ['gl_compatibility', 'mobile', 'forward_plus'];
const renderer = process.argv.find(argument => argument.startsWith('--renderer='))?.slice('--renderer='.length);
if (renderer !== undefined && !RENDERERS.includes(renderer)) throw new Error(`--renderer=${renderer}: one of ${RENDERERS.join(', ')}`);
// `--lab=<id>` starts the demo on that lab, as `pnpm demo --lab=<id>` does (demo/src/launch.ts); the `navigator` section then checks the
// start itself, so it is for `--interaction --only=navigator`.
const lab = process.argv.find(argument => argument.startsWith('--lab='))?.slice('--lab='.length);
const viewport = process.argv.find(argument => argument.startsWith('--viewport='))?.slice('--viewport='.length);
if (viewport !== undefined && !/^\d+x\d+$/u.test(viewport)) throw new Error(`--viewport=${viewport}: WxH`);
const artifactRoot = engine.artifactPath(`${motion ? 'native-motion' : interaction ? 'native-interaction' : 'native'}${renderer === undefined || renderer === 'gl_compatibility' ? '' : `-${renderer}`}`);
const userFlag = motion ? '--verify-motion' : interaction ? '--verify-interaction' : '--verify';
// `--only=<section>[,<section>]` runs just those sections of the interaction verifier.
const only = process.argv.filter(argument => argument.startsWith('--only='));
// `--no-retry` runs each window once, whatever disturbed it: for negative controls, where a re-run would hide the very failure being looked for.
const retry = !process.argv.includes('--no-retry');
// The landscape and portrait windows are two Godot processes with nothing in common, and run at the same time. `--serial` runs one after the other, the way
// every run did before: to tell whether running together changes a result, or on a host that cannot carry two windows.
const serial = process.argv.includes('--serial');
if (only.length > 0 && !interaction) throw new Error('--only=<section> applies to the interaction workflow (--interaction).');
if (lab !== undefined && (!interaction || !only.includes('--only=navigator'))) throw new Error('--lab=<id> applies to --interaction --only=navigator: that section checks the start on a lab.');
if (lab === '') throw new Error('--lab= needs the id of a lab');
// A typo must fail here, before the build and the window, not inside Godot.
const requested = requestedSections(process.argv.slice(2));
checkSectionNames(requested, NATIVE_INTERACTION_SECTIONS);
const deadlineMs = interaction
  ? interactionDeadlineMs(sectionsToRun(NATIVE_INTERACTION_SECTIONS, NATIVE_OPT_IN_SECTIONS, requested).length)
  : DEFAULT_DEADLINE_MS;
// `--faults` runs against the filters negative-controls library (`pnpm build:native --faults`, the `filters-faults` section);
// every other run refuses that library, and this one refuses a default build.
const faults = process.argv.includes('--faults');
if (faults && !requested.some(name => name === 'filters-faults' || name === 'transforms-faults')) {
  throw new Error('--faults is for the filters-faults and transforms-faults sections: pass --only=filters-faults or --only=transforms-faults.');
}
// Fail first if the binary or the installed library belongs to the other engine profile.
engine.prepareNative({ faults });
// The `live-compile` section needs the checker and transpiler (the godot-tsc package's addon: scripts/godot-tsc.mjs) and the project it opens,
// which is made from the labs' sources as they are now.
// The `code-editor` section uses it when it is installed (and checks the read-only panel when it is not): an installed extension must still be
// fresh, or the section would run the live path against an old compiler.
const usesLiveCompile = requested.includes('live-compile') || ((requested.length === 0 || requested.includes('code-editor')) && isGodotTscInstalled());
if (usesLiveCompile) {
  requireGodotTsc();
  const project = spawnSync('node', [resolve(root, 'scripts/live-compile-project.mjs')], { cwd: root, stdio: 'inherit' });
  if (project.error) throw project.error;
  if (project.status !== 0) process.exit(project.status ?? 1);
}
// Never launch runtime acceptance against missing or type-invalid JS artifacts.
const build = spawnSync('pnpm', ['build'], {cwd:root, stdio:'inherit'});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
importDemo(godot);
const windows = viewport === undefined ? [['landscape', '1120x800'], ['portrait', '600x900']] : [[`viewport-${viewport}`, '1120x800']];
const results = await runNativeVerifiers({
  godot, project: resolve(root, 'demo'),
  leading: renderer === undefined ? [] : ['--rendering-method', renderer],
  scriptArgs: [userFlag, ...only, ...(lab === undefined ? [] : [`--lab=${lab}`]), ...(viewport === undefined ? [] : [`--logical-viewport=${viewport}`])], successMarker, deadlineMs, retry,
  // The builds are checked again before every window, not only before the first: another session may rebuild or switch them in between.
  beforeLaunch: () => engine.requireInstalledBuilds({ faults }),
  errorPattern: /ERROR:|Uncaught|\[panic /u,
}, windows.map(([name, resolution]) => ({ name, resolution, output: resolve(artifactRoot, name) })), { serial });
console.log(`${userFlag.slice(2)} summary:\n${summarizeRuns(results)}`);
