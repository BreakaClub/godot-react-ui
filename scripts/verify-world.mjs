import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
import { importDemo } from './import-demo.mjs';
import { selectEngine } from './engine.mjs';
import { runNativeVerifiers, summarizeRuns } from './native-run.mjs';

// The world-space panel (docs/WORLD_SPACE.md). Godot runs a scene other than the project's main
// scene when its path follows the project options; arguments for the scripts follow `--`.
rejectUnknownArguments(process.argv.slice(2), { flags: ['--no-retry', '--serial'] });
const root = resolve(import.meta.dirname, '..');
const engine = selectEngine();
const godot = engine.godot;
const deadlineMs = 120_000;
const scene = 'res://world.tscn';
const successMarker = 'GODOT_REACT_WORLD_VERIFY_PASSED';
const artifactRoot = engine.artifactPath('native-world');
// Fail first if the binary or the installed library belongs to the other engine profile.
engine.prepareNative();
// Never launch runtime acceptance against missing or type-invalid JS artifacts.
const build = spawnSync('pnpm', ['build'], {cwd:root, stdio:'inherit'});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
importDemo(godot);
// `--no-retry` runs each window once, whatever disturbed it (see scripts/verify.mjs).
const retry = !process.argv.includes('--no-retry');
// The two windows run at the same time; `--serial` runs them one after the other (see scripts/verify.mjs).
const serial = process.argv.includes('--serial');
const results = await runNativeVerifiers({
  godot, project: resolve(root, 'demo'), leading: [scene], scriptArgs: ['--verify-world'], successMarker, deadlineMs, retry,
  beforeLaunch: () => engine.requireInstalledBuilds(),
  // `previously notified` is the engine's warning for an unpaired notifyMouseEntered/notifyMouseExited.
  errorPattern: /ERROR:|Uncaught|\[panic |previously notified/u,
}, [['landscape', '1120x800'], ['portrait', '600x900']].map(([name, resolution]) => ({ name, resolution, output: resolve(artifactRoot, name) })), { serial });
console.log(`verify-world summary:\n${summarizeRuns(results)}`);
