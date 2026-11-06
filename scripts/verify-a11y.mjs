import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importDemo } from './import-demo.mjs';
import { checkElements, checkFocus, numeric } from './a11y-expectations.mjs';
import { findByLabel, flatten } from './ax-tree.mjs';

// Phase I10: the accessibility tree the platform sees (docs/tracks/accessibility.md). Godot runs the lab scene
// (demo/a11y.tscn) with `--accessibility always`, so the platform tree exists without a screen reader running;
// scripts/ax-dump.swift reads it from outside the process (macOS Accessibility API, read only), and the
// lab's Godot-side verifier (demo/src/verify-a11y.ts) changes state with Godot's own input in between. The two
// processes hand over through files in one directory: `ready.*` (initial state), `go-mutate`, `mutated.*`,
// `go-finish`, or `unsupported.*` when the engine has no accessibility driver.
//
// Reading another process's tree needs macOS Accessibility permission for the process that runs this script.
// Nothing here performs an accessibility action, types, clicks or changes a system setting.
const root = resolve(import.meta.dirname, '..');
const godot = process.env.GODOT ?? '/Applications/Godot48.app/Contents/MacOS/Godot';
const scene = 'res://a11y.tscn';
const artifactRoot = resolve(root, 'artifacts/native-a11y');
const swiftSource = resolve(import.meta.dirname, 'ax-dump.swift');
const axDump = resolve(artifactRoot, 'bin/ax-dump');
const resolution = '900x700';

/** The window is up and the lab mounted within this long. */
const READY_DEADLINE_MS = 60_000;
/** The platform adapter builds its tree on the first request; the elements may take a few frames after it. */
const TREE_DEADLINE_MS = 30_000;
const TREE_POLL_MS = 500;
const DUMP_TIMEOUT_MS = 20_000;
const EXIT_DEADLINE_MS = 30_000;
const FILE_POLL_MS = 50;
const SWIFT_DEADLINE_MS = 240_000;
/** A rerun happens only for interference (input from another device, the window losing focus), at most twice. */
const MAX_RERUNS = 2;
const EXIT_NOT_VERIFIED = 2;
const EXIT_NO_PERMISSION = 3;
/** ax-dump.swift exits with this when the process has no accessibility tree to read yet. */
const AX_EXIT_NO_APPLICATION = 4;
const AX_EXIT_NOT_TRUSTED = 3;

const successMarker = 'GODOT_REACT_A11Y_VERIFY_PASSED';
/** The line the Godot-side run prints when its own half passed, which a log search can look for. */
const nativeMarker = 'GODOT_REACT_A11Y_NATIVE_PASSED';

class Blocked extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function sleep(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms));
}

/** A read-only tool stays read-only: refuse to run it if its source mentions a call that could act. */
function assertDumpToolIsReadOnly() {
  const forbidden = /AXUIElementPerformAction|AXUIElementSetAttributeValue|AXUIElementPostKeyboardEvent|AXUIElementPostEvent|AXUIElementSetValue|CGEvent|NSEvent|osascript|System Events/u;
  const found = readFileSync(swiftSource, 'utf8').match(forbidden);
  if (found) throw new Error(`scripts/ax-dump.swift mentions ${found[0]}; it must only read the accessibility tree`);
}

function buildDumpTool() {
  mkdirSync(resolve(artifactRoot, 'bin'), { recursive: true });
  if (existsSync(axDump) && statSync(axDump).mtimeMs > statSync(swiftSource).mtimeMs) return;
  const result = spawnSync('swiftc', ['-O', swiftSource, '-o', axDump], { stdio: 'inherit', timeout: SWIFT_DEADLINE_MS });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`swiftc failed compiling scripts/ax-dump.swift (${result.status})`);
}

/** One reading of the process's accessibility tree. Returns `undefined` while the process has none yet. */
function dump(pid) {
  const result = spawnSync(axDump, [String(pid)], { encoding: 'utf8', timeout: DUMP_TIMEOUT_MS });
  if (result.error) throw result.error;
  if (result.status === AX_EXIT_NOT_TRUSTED) {
    throw new Blocked(
      'macOS Accessibility permission is missing. Open System Settings > Privacy & Security > Accessibility and '
      + 'turn on the application that runs this script (the terminal, or the app hosting the agent), then run '
      + '`pnpm verify:a11y` again. Nothing else needs to be granted, and this script changes no system setting.',
      EXIT_NO_PERMISSION,
    );
  }
  if (result.status === AX_EXIT_NO_APPLICATION) return undefined;
  if (result.status !== 0) throw new Error(`ax-dump exited ${result.status}: ${result.stdout}${result.stderr}`);
  return JSON.parse(result.stdout);
}

/** Read the tree until `satisfied(nodes)` holds or the deadline passes; the last reading either way. */
async function dumpUntil(pid, satisfied) {
  const deadline = Date.now() + TREE_DEADLINE_MS;
  let last;
  for (;;) {
    const reading = dump(pid);
    if (reading !== undefined) {
      last = reading;
      if (satisfied(flatten(reading.tree))) return { reading, satisfied: true };
    }
    if (Date.now() > deadline) return { reading: last, satisfied: false };
    await sleep(TREE_POLL_MS);
  }
}

/** Resolve when `path` exists; reject if Godot exits first or the deadline passes. */
async function waitForFile(path, deadlineMs, session) {
  const deadline = Date.now() + deadlineMs;
  while (!existsSync(path)) {
    if (session.exited) throw new Error(`Godot exited (${session.code}) before writing ${path}; see the run log`);
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${path}`);
    await sleep(FILE_POLL_MS);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Start Godot on the lab with the shared directory; its log is collected and echoed. */
function launch(directory) {
  const child = spawn(godot, [
    '--audio-driver', 'Dummy', '--accessibility', 'always', '--path', resolve(root, 'demo'),
    '--resolution', resolution, scene, '--', '--verify-a11y',
  ], { env: { ...process.env, GODOT_REACT_A11Y_DIR: directory }, stdio: ['ignore', 'pipe', 'pipe'] });
  const session = { child, log: '', exited: false, code: undefined };
  const collect = data => {
    const text = data.toString();
    session.log += text;
    process.stdout.write(text);
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  session.done = new Promise((resolvePromise, reject) => {
    child.on('error', reject);
    child.on('exit', code => {
      session.exited = true;
      session.code = code;
      resolvePromise(code);
    });
  });
  return session;
}

async function finishSession(session) {
  const timer = setTimeout(() => session.child.kill('SIGTERM'), EXIT_DEADLINE_MS);
  const code = await session.done;
  clearTimeout(timer);
  return code;
}

async function attempt(number) {
  const directory = resolve(artifactRoot, `run-${Date.now()}-${number}`);
  mkdirSync(directory, { recursive: true });
  const session = launch(directory);
  const result = { directory, failures: [], interference: 0, unsupported: false };
  try {
    // Either the first state is ready, or the engine has no accessibility driver and says so.
    const readyPath = resolve(directory, 'ready.marker');
    const unsupportedPath = resolve(directory, 'unsupported.marker');
    const deadline = Date.now() + READY_DEADLINE_MS;
    while (!existsSync(readyPath) && !existsSync(unsupportedPath)) {
      if (session.exited) throw new Error(`Godot exited (${session.code}) before the lab was ready; see ${directory}/run.log`);
      if (Date.now() > deadline) throw new Error('Timed out waiting for the lab');
      await sleep(FILE_POLL_MS);
    }
    if (existsSync(unsupportedPath)) {
      result.unsupported = true;
      await finishSession(session);
      return result;
    }
    const ready = readJson(resolve(directory, 'ready.json'));
    console.log(`ENGINE ${JSON.stringify(ready.engine)}; window ${JSON.stringify(ready.window)}`);
    const first = await dumpUntil(ready.processId, nodes => findByLabel(nodes, 'Save', ['AXButton']).length > 0);
    if (first.reading === undefined) throw new Error('The platform never exposed an accessibility tree for the lab');
    writeFileSync(resolve(directory, 'ax-before.json'), JSON.stringify(first.reading, null, 2));
    result.failures.push(...checkElements(first.reading, 0, ready.nodes).map(failure => `before: ${failure}`));

    writeFileSync(resolve(directory, 'go-mutate'), '');
    await waitForFile(resolve(directory, 'mutated.marker'), READY_DEADLINE_MS, session);
    const mutated = readJson(resolve(directory, 'mutated.json'));
    const second = await dumpUntil(ready.processId, nodes => findByLabel(nodes, 'Volume', ['AXSlider'])
      .some(node => numeric(node.value) === 80));
    writeFileSync(resolve(directory, 'ax-after.json'), JSON.stringify(second.reading, null, 2));
    result.failures.push(...checkElements(second.reading, 1, mutated.nodes).map(failure => `after: ${failure}`));
    result.failures.push(...checkFocus(second.reading).map(failure => `after: ${failure}`));
    const interference = [ready.interference, mutated.interference];
    result.interference = interference.reduce((sum, entry) => sum + entry.foreignInput + entry.windowFocusLosses, 0);

    writeFileSync(resolve(directory, 'go-finish'), '');
    const code = await finishSession(session);
    if (!session.log.includes(successMarker) || session.log.includes('GODOT_REACT_VERIFY_FAILED')) {
      result.failures.push(`the Godot-side verification did not pass (exit ${code})`);
    }
    if (/ERROR:|Uncaught|\[panic /u.test(session.log.split(successMarker)[0])) {
      result.failures.push('Godot logged an error before the verification completed');
    }
  } catch (error) {
    if (error instanceof Blocked) throw error;
    result.failures.push(error instanceof Error ? error.message : String(error));
  } finally {
    if (!session.exited) session.child.kill('SIGTERM');
    writeFileSync(resolve(directory, 'run.log'), session.log);
  }
  return result;
}

if (process.platform !== 'darwin') throw new Error('verify:a11y reads the macOS accessibility tree; run it on macOS');
assertDumpToolIsReadOnly();
const build = spawnSync('pnpm', ['build'], { cwd: root, stdio: 'inherit' });
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
importDemo(godot);
buildDumpTool();

try {
  let outcome;
  for (let number = 0; number <= MAX_RERUNS; number += 1) {
    outcome = await attempt(number);
    if (outcome.unsupported || outcome.failures.length === 0 || outcome.interference === 0) break;
    console.warn(`Attempt ${number} failed with ${outcome.interference} sign(s) of interference (foreign input or lost window focus); rerunning.`);
  }
  if (outcome.unsupported) {
    console.error(
      `${nativeMarker}: the Godot-side checks passed, but the platform tree was NOT verified. ${godot} has no accessibility `
      + 'driver (AccessibilityServer.is_supported() is false: the engine was built without AccessKit). Build the engine '
      + 'with the AccessKit SDK (accesskit=yes and accesskit_sdk_path pointing at bin/build_deps/accesskit in the engine '
      + `checkout) and run this again. Evidence: ${outcome.directory}`,
    );
    process.exit(EXIT_NOT_VERIFIED);
  }
  if (outcome.failures.length > 0) {
    throw new Error(`Accessibility verification failed:\n - ${outcome.failures.join('\n - ')}\nEvidence: ${outcome.directory}`);
  }
  console.log(`Accessibility verification passed. Evidence: ${outcome.directory}`);
} catch (error) {
  if (error instanceof Blocked) {
    console.error(error.message);
    process.exit(error.status);
  }
  throw error;
}
