import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importDemo } from './import-demo.mjs';
import { selectEngine } from './engine.mjs';
import { runNativeVerifier, summarizeRuns } from './native-run.mjs';

// Phase I10: the accessibility tree the platform sees (docs/tracks/accessibility.md). Godot runs the lab scene
// (demo/a11y.tscn) with `--accessibility always`, so the platform tree exists without a screen reader running.
// The run reads that tree from inside, by starting scripts/ax-dump.swift (macOS Accessibility API, read only)
// against its own process before and after it changes state with Godot's own input, and judges it with
// scripts/a11y-expectations.mjs; this script builds the dump tool, launches the run through the shared native
// runner (isolation from real input, reruns only for a disturbed failure: plan D21, D22) and reports.
//
// Reading a process's tree needs macOS Accessibility permission for the process that runs this script.
// Nothing here performs an accessibility action, types, clicks or changes a system setting.
const root = resolve(import.meta.dirname, '..');
const engine = selectEngine();
const godot = engine.godot;
const scene = 'res://a11y.tscn';
const artifactRoot = engine.artifactPath('native-a11y');
const swiftSource = resolve(import.meta.dirname, 'ax-dump.swift');
const axDump = resolve(artifactRoot, 'bin/ax-dump');
/** The hash of the source `axDump` was compiled from, beside it: the tool is rebuilt when the source differs, whatever the file times say. */
const axDumpSource = `${axDump}.source.sha256`;
const resolution = '900x900';
// Six platform readings of the lab (two before and after the Godot-side input, two while it is scrolled, the window outline): each is
// several seconds, because the target answers one attribute request per frame.
const deadlineMs = 300_000;
const successMarker = 'GODOT_REACT_A11Y_VERIFY_PASSED';
const unsupportedMarker = 'GODOT_REACT_A11Y_UNSUPPORTED';
const notTrustedMarker = 'GODOT_REACT_A11Y_NOT_TRUSTED';
const swiftDeadlineMs = 240_000;
const exitNotVerified = 2;
const exitNoPermission = 3;

/** A read-only tool stays read-only: refuse to run it if its source mentions a call that could act. */
function assertDumpToolIsReadOnly() {
  const forbidden = /AXUIElementPerformAction|AXUIElementSetAttributeValue|AXUIElementPostKeyboardEvent|AXUIElementPostEvent|AXUIElementSetValue|CGEvent|NSEvent|osascript|System Events/u;
  const found = readFileSync(swiftSource, 'utf8').match(forbidden);
  if (found) throw new Error(`scripts/ax-dump.swift mentions ${found[0]}; it must only read the accessibility tree`);
}

function buildDumpTool() {
  mkdirSync(resolve(artifactRoot, 'bin'), { recursive: true });
  const sourceHash = createHash('sha256').update(readFileSync(swiftSource)).digest('hex');
  if (existsSync(axDump) && existsSync(axDumpSource) && readFileSync(axDumpSource, 'utf8').trim() === sourceHash) return;
  const result = spawnSync('swiftc', ['-O', swiftSource, '-o', axDump], { stdio: 'inherit', timeout: swiftDeadlineMs });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`swiftc failed compiling scripts/ax-dump.swift (${result.status})`);
  writeFileSync(axDumpSource, `${sourceHash}\n`);
}

if (process.platform !== 'darwin') throw new Error('verify:a11y reads the macOS accessibility tree; run it on macOS');
assertDumpToolIsReadOnly();
// Fail first if the binary or the installed library belongs to the other engine profile.
engine.prepareNative();
const build = spawnSync('pnpm', ['build'], { cwd: root, stdio: 'inherit' });
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
importDemo(godot);
buildDumpTool();
// The run starts the dump tool against itself; it is told which one through the environment, which the runner inherits.
process.env.GODOT_REACT_AX_DUMP = axDump;

const output = resolve(artifactRoot, 'run');
// `--no-retry` runs the window once, whatever disturbed it (see scripts/verify.mjs).
const retry = !process.argv.includes('--no-retry');
try {
  const result = await runNativeVerifier({
    godot, project: resolve(root, 'demo'), output, name: 'a11y', resolution,
    leading: ['--accessibility', 'always', scene], scriptArgs: ['--verify-a11y'], successMarker, deadlineMs, retry,
    beforeLaunch: () => engine.requireInstalledLibrary(),
    errorPattern: /ERROR:|Uncaught|\[panic /u,
  });
  console.log(`Accessibility verification passed. Evidence: ${output} (ax-before.json, ax-after.json, run.log)`);
  console.log(`verify-a11y summary:\n${summarizeRuns([result])}`);
} catch (error) {
  // A run that could not read the platform tree is not a failure of the code under test and not a pass. The runner clears the
  // previous run's log before it launches, so what is read here is this run's, or nothing.
  const log = existsSync(resolve(output, 'run.log')) ? readFileSync(resolve(output, 'run.log'), 'utf8') : '';
  if (log.includes(notTrustedMarker)) {
    console.error(
      'macOS Accessibility permission is missing. Open System Settings > Privacy & Security > Accessibility and '
      + 'turn on the application that runs this script (the terminal, or the app hosting the agent), then run '
      + '`pnpm verify:a11y` again. Nothing else needs to be granted, and this script changes no system setting.',
    );
    process.exit(exitNoPermission);
  }
  if (log.includes(unsupportedMarker)) {
    console.error(
      `The Godot-side checks passed, but the platform tree was NOT verified: ${godot} has no accessibility driver `
      + '(AccessibilityServer.is_supported() is false: the engine was built without AccessKit). Use an engine built '
      + `with the AccessKit SDK (accesskit=yes, accesskit_sdk_path at bin/build_deps/accesskit). Evidence: ${output}`,
    );
    process.exit(exitNotVerified);
  }
  throw error;
}
