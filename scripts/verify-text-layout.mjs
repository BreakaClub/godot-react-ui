import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { argsWithoutEngine, selectEngine } from './engine.mjs';
import { importDemo } from './import-demo.mjs';
import { runNativeVerifier, summarizeRuns } from './native-run.mjs';

// Text layout probe (docs/tracks/text-layout.md): caret, hit-test and selection geometry against a running
// Godot. It needs a probe build of the extension (`pnpm build:native --probe`; restore a default
// `pnpm build:native` afterwards). The probe takes no input: it reads geometry and draws, so the window
// only has to exist. `--headless` skips the pixel checks and the captures, and the run then says it was partial
// (the marker line and the summary): it is a smoke check of the geometry, not the verification.
const root = resolve(import.meta.dirname, '..');
const engine = selectEngine();
const godot = engine.godot;
const deadlineMs = 120_000;
const scene = 'res://text-layout-probe.tscn';
const successMarker = 'GODOT_REACT_TEXT_LAYOUT_VERIFY_PASSED';
for (const argument of argsWithoutEngine(process.argv.slice(2))) {
  if (argument !== '--headless') throw new Error(`Unknown argument: ${argument}`);
}
const headless = process.argv.includes('--headless');
const output = engine.artifactPath('native-text-layout');
// Fail first if the binary or the installed library belongs to the other engine profile.
engine.prepareNative({probe: true});
// Never launch runtime acceptance against missing or type-invalid JS artifacts.
const build = spawnSync('pnpm', ['build'], {cwd:root, stdio:'inherit'});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
importDemo(godot);
// The probe takes no input, so there is no input isolation and no interference to tell apart: one window, run once.
const result = await runNativeVerifier({
  godot, project: resolve(root, 'demo'), output, name: headless ? 'text-layout (headless)' : 'text-layout', resolution: '1120x800',
  leading: [...(headless ? ['--headless'] : []), scene], scriptArgs: ['--verify-text-layout'], successMarker, deadlineMs, retry: false,
  beforeLaunch: () => engine.requireInstalledLibrary({probe: true}),
  errorPattern: /ERROR:|Uncaught|\[panic /u,
});
console.log(`verify-text-layout summary:\n${summarizeRuns([result])}`);
