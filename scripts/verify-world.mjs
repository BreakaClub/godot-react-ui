import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { importDemo } from './import-demo.mjs';
import { selectEngine } from './engine.mjs';
import { runNativeVerifier } from './native-run.mjs';

// Phase I11: the world-space panel (docs/WORLD_SPACE.md). Godot runs a scene other than the project's main
// scene when its path follows the project options; arguments for the scripts follow `--`.
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
for (const [name, resolution] of [['landscape','1120x800'],['portrait','600x900']]) {
  await runNativeVerifier({
    godot, project: resolve(root, 'demo'), output: resolve(artifactRoot, name), name, resolution,
    leading: [scene], scriptArgs: ['--verify-world'], successMarker, deadlineMs,
    // `previously notified` is the engine's warning for an unpaired notifyMouseEntered/notifyMouseExited.
    errorPattern: /ERROR:|Uncaught|\[panic |previously notified/u,
  });
}
