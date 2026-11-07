import { Engine, FileAccess, InputEventKey, InputEventMouseButton, Key, MouseButton, Node, OS, Time, Vector2 } from 'godot';
import type { LayoutRect, NativeProfile, NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import type { RendererProfile } from '../../src/profile';
import { GLYPH_POSITION_STEP_PX } from './editor/font-grid';
import { TYPING_SITES, runKeystrokeBench, summarizeAll } from './editor/keystroke-bench';
import type { NavigatorOptions } from './main';
import { parseVerifierEvent } from './verifier-input';
import { move } from './verify-text-input';

/**
 * Keystroke cost diagnostic (docs/tracks/keystroke-profile.md): types into the lab navigator's code panel through the same key
 * injection the `code-editor` verifier uses, and reports what each keystroke cost, from the renderer's own profiler and the native
 * library's. It changes no behaviour of the editor; it only drives it.
 *
 * It does nothing unless the demo is started with `--profile-keystrokes`. Then `globalThis.godotReactKeystrokeProfile` has the steps below,
 * and a client of the V8 inspector (`scripts/profile-keystrokes.mjs`) calls them with `Runtime.evaluate` and starts and stops the CPU
 * profiler between them, so the profile holds the keystrokes and not the set-up. With `--profile-keystrokes=standalone` the demo runs the
 * same steps by itself, with no inspector client attached, and prints the numbers: that is the run the profiler's own cost is measured
 * against.
 *
 * Typing is done in bursts of inserts followed by as many Backspaces, so the text returns to the source and the line the caret is on keeps
 * its length. A burst is shorter than the workspace's longest wait (`UPDATE_MAX_WAIT_MS`, 600 ms) and each key is within the debounce
 * (`UPDATE_DEBOUNCE_MS`, 150 ms) of the one before, so the live recompile runs after the burst, in `settle`, and never inside it.
 */
export interface KeystrokeProfileInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  showNavigator(options?: NavigatorOptions): void;
  profile(enabled: boolean): void;
  takeProfile(): { js: RendererProfile; native: NativeProfile };
}

export interface BurstRequest {
  /** Characters typed, and then as many Backspaces. */
  readonly inserts: number;
  /** Whether the renderer's and the native library's profilers are on while it runs. */
  readonly rendererProfile: boolean;
}

/** One key press and release: how long `Input.parseInputEvent` took for each (everything the key causes happens inside it) and what the profilers saw. */
export interface KeystrokeRecord {
  readonly kind: 'insert' | 'delete';
  readonly pressUs: number;
  readonly releaseUs: number;
  readonly press: ProfileDigest | null;
  readonly release: ProfileDigest | null;
}

/** The renderer profile of one injected event, as numbers. */
export interface ProfileDigest {
  /** `events` samples: the whole dispatch of what native queued, inclusive of the commit. */
  readonly events: readonly number[];
  /** `reconcile` samples. */
  readonly reconciles: readonly number[];
  /** `flush` samples: [walk, json, nativeCall, full, visited, commands, jsonChars]. */
  readonly flushes: readonly (readonly number[])[];
  /** Native `batch` samples: [parse, validate, mount, layout, geometry, total] in microseconds. */
  readonly batches: readonly (readonly number[])[];
  /** Native `draw` samples (the paint pass: the canvas items of the nodes whose paint inputs changed are recorded again), in microseconds. */
  readonly draws: readonly number[];
  /** Native `frame` samples, which a key press alone should not make. */
  readonly frames: number;
  /** What the native counters grew by: the fields of `COUNTED`. */
  readonly counted: Readonly<Record<string, number>>;
}

const FRAME_POLL_MS = 1;
const MICROSECONDS_PER_MILLISECOND = 1000;
const DEADLINE_MS = 8_000;
const QUIET_DEADLINE_MS = 4_000;
const DIGIT_ZERO = 0x30;
const DIGIT_NINE = 0x39;
const LETTER_A = 0x41;
const LETTER_Z = 0x5a;
const LAB_ID = 'inputs';
const LAB_SOURCE = 'res://src/inputs-lab.tsx';
/** The characters typed, in turn; letters only, so the highlight sees an identifier or the inside of a string and nothing else. */
const TYPED = 'abcdefghijklmnopqrstuvwxyz';
const STANDALONE_ARGUMENT = '--profile-keystrokes=standalone';
/** What a standalone run does unless `--site=`, `--warmup=`, `--bursts=`, `--inserts=` or `--renderer-profile=off` say otherwise. */
const DEFAULT_WARMUP = 200;
const DEFAULT_BURSTS = 25;
const DEFAULT_INSERTS = 8;
const FRAMES_AFTER_OPEN = 30;
const MIB = 1024 * 1024;

function nowUs(): number {
  return Time.getTicksUsec();
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

function centerOf(rect: LayoutRect): Vector2 {
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

/** Press and release a key of a typed character, as the verifier's `injectCharacter` does it. */
function characterEvent(character: string, pressed: boolean): void {
  const code = character.toUpperCase().codePointAt(0) ?? 0;
  const letterOrDigit = (code >= DIGIT_ZERO && code <= DIGIT_NINE) || (code >= LETTER_A && code <= LETTER_Z);
  const event = new InputEventKey();
  event.keycode = letterOrDigit ? code : Key.KeyNone;
  event.physicalKeycode = event.keycode;
  event.unicode = character.codePointAt(0) ?? 0;
  event.pressed = pressed;
  parseVerifierEvent(event);
}

function keyEvent(keycode: Key, pressed: boolean): void {
  const event = new InputEventKey();
  event.keycode = keycode;
  event.physicalKeycode = keycode;
  event.keyLabel = keycode;
  event.pressed = pressed;
  parseVerifierEvent(event);
}

function leftButton(position: Vector2, pressed: boolean): void {
  const event = new InputEventMouseButton();
  event.position = position;
  event.globalPosition = position;
  event.buttonIndex = MouseButton.MouseButtonLeft;
  event.pressed = pressed;
  parseVerifierEvent(event);
}

/** The cumulative native counters that say how much work a commit did. */
const COUNTED = ['mutations', 'nodesUpdated', 'nodesRestyled', 'boxRecords', 'contentRecords', 'paragraphBuilds', 'paragraphRepaints', 'layoutPasses', 'paintPasses'] as const;

function countersOf(native: NativeProfile): Record<string, number> {
  const found: Record<string, number> = {};
  for (const name of COUNTED) found[name] = native.counters[name];
  return found;
}

function digest(api: KeystrokeProfileInspection, before: Readonly<Record<string, number>>): ProfileDigest {
  const { js, native } = api.takeProfile();
  const after = countersOf(native);
  const counted: Record<string, number> = {};
  for (const name of COUNTED) counted[name] = (after[name] ?? 0) - (before[name] ?? 0);
  const events: number[] = [];
  const reconciles: number[] = [];
  const flushes: number[][] = [];
  for (const sample of js.samples) {
    if (sample.kind === 'events') events.push(sample.durationMs);
    else if (sample.kind === 'reconcile') reconciles.push(sample.durationMs);
    else flushes.push([sample.walkMs, sample.jsonEncodeMs, sample.nativeCallMs, sample.fullFlushMs, sample.visitedNodes, sample.commandCount, sample.jsonChars]);
  }
  const batches: number[][] = [];
  const draws: number[] = [];
  let frameSamples = 0;
  for (const sample of native.samples) {
    if (sample.kind === 'batch') {
      batches.push(['parseMicros', 'validateMicros', 'mountMicros', 'layoutMicros', 'geometryMicros', 'totalMicros'].map(field => Number(sample[field])));
    } else if (sample.kind === 'draw') {
      draws.push(Number(sample['cpuMicros']));
    } else {
      frameSamples += 1;
    }
  }
  return { events, reconciles, flushes, batches, draws, frames: frameSamples, counted };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function installKeystrokeProfile(owner: Node, api: KeystrokeProfileInspection, userArgs: readonly string[]): void {
  const node = (testID: string): NativeSnapshotNode => {
    const found = api.find(testID);
    assert(found !== undefined, `Missing test target ${testID}`);
    return found;
  };
  const text = (testID: string): string => api.find(testID)?.text ?? '';

  async function waitUntil(what: string, predicate: () => boolean, deadlineMs = DEADLINE_MS): Promise<void> {
    const started = Time.getTicksMsec();
    while (!predicate()) {
      assert(Time.getTicksMsec() - started < deadlineMs, `Timed out after ${deadlineMs} ms waiting for ${what}`);
      await frames(1);
    }
  }

  async function pressKey(keycode: Key, times: number): Promise<void> {
    for (let count = 0; count < times; count += 1) {
      keyEvent(keycode, true);
      keyEvent(keycode, false);
      await frames(2);
    }
  }

  /** Waits for the recompile and the type check the last edits caused, so none of their work falls in the next burst. */
  async function settle(): Promise<void> {
    await waitUntil('the recompile to start', () => !text('code-status-run').startsWith('Waiting for a pause'), QUIET_DEADLINE_MS);
    await waitUntil('the type check', () => text('code-status-check') !== 'Checking…', QUIET_DEADLINE_MS);
    await frames(3);
  }

  /** The first and last of the lines the editor has as elements now: its window of the file. */
  function mountedLines(): { first: number; last: number } {
    const numbers = api.snapshot().nodes.flatMap(entry => {
      const match = /^code-line-(\d+)$/u.exec(String(entry.props.testID ?? ''));
      return match === null ? [] : [Number(match[1])];
    });
    return { first: Math.min(...numbers), last: Math.max(...numbers) };
  }

  async function prepare(siteName: string): Promise<{ site: string; line: number; column: number; lines: number; window: { first: number; last: number } }> {
    const site = TYPING_SITES.find(candidate => candidate.name === siteName);
    assert(site !== undefined, `No typing site called ${siteName}`);
    api.showNavigator({ initialLab: LAB_ID });
    await frames(FRAMES_AFTER_OPEN);
    const toggle = centerOf(node('toggle-code').rect);
    move(toggle);
    await frames(3);
    leftButton(toggle, true);
    leftButton(toggle, false);
    await waitUntil('the first line of code', () => api.find('code-line-1') !== undefined);
    await waitUntil('the caret', () => api.find('code-caret') !== undefined);
    await settle();
    const source = FileAccess.getFileAsString(LAB_SOURCE);
    assert(source.length > 0, `The source ${LAB_SOURCE} is in the build`);
    const at = source.indexOf(site.needle);
    assert(at >= 0, `The source has no ${site.needle}`);
    const before = source.slice(0, at);
    const line = before.split('\n').length;
    const column = at - (before.lastIndexOf('\n') + 1) + site.offset;
    // Scroll to the line by moving the caret there: a click on line 1, Down to the line, Home, Right to the column.
    const probe = node('editor-grid-probe').rect;
    const advance = Math.round(probe.width / 400 / GLYPH_POSITION_STEP_PX) * GLYPH_POSITION_STEP_PX;
    const content = node('code-content').rect;
    const gutter = node('code-gutter').rect.width;
    const firstLine = new Vector2(content.x + gutter + advance / 2, content.y + probe.height / 2);
    move(firstLine);
    await frames(3);
    leftButton(firstLine, true);
    leftButton(firstLine, false);
    await frames(3);
    await pressKey(Key.KeyDown, line - 1);
    await pressKey(Key.KeyHome, 2);
    await pressKey(Key.KeyRight, column);
    await settle();
    const position = /^Ln (\d+), Col (\d+)/u.exec(text('code-status-position'));
    assert(position !== null, `The status bar has a position: ${text('code-status-position')}`);
    assert(Number(position[1]) === line && Number(position[2]) - 1 === column, `The caret is at ${line}:${column}: ${text('code-status-position')}`);
    return { site: site.name, line, column, lines: source.split('\n').length, window: mountedLines() };
  }

  /** One keystroke: a frame first, as there is in typing, then the press and the release, each timed from outside and read from the profilers. */
  async function keystroke(kind: 'insert' | 'delete', character: string, profiled: boolean): Promise<KeystrokeRecord> {
    await frames(1);
    const before = profiled ? countersOf(api.takeProfile().native) : {};
    const pressStart = nowUs();
    if (kind === 'insert') characterEvent(character, true); else keyEvent(Key.KeyBackspace, true);
    const pressUs = nowUs() - pressStart;
    const press = profiled ? digest(api, before) : null;
    const releaseStart = nowUs();
    if (kind === 'insert') characterEvent(character, false); else keyEvent(Key.KeyBackspace, false);
    const releaseUs = nowUs() - releaseStart;
    const release = profiled ? digest(api, {}) : null;
    return { kind, pressUs, releaseUs, press, release };
  }

  /** `inserts` characters and then `inserts` Backspaces, in one go (no wait for the recompile inside it). */
  async function burst(request: BurstRequest): Promise<KeystrokeRecord[]> {
    assert(request.inserts > 0, 'A burst types at least one character');
    api.profile(request.rendererProfile);
    const records: KeystrokeRecord[] = [];
    for (let index = 0; index < request.inserts; index += 1) {
      records.push(await keystroke('insert', TYPED.charAt(index % TYPED.length), request.rendererProfile));
    }
    for (let index = 0; index < request.inserts; index += 1) records.push(await keystroke('delete', '', request.rendererProfile));
    api.profile(false);
    return records;
  }

  async function warmup(keystrokes: number): Promise<number> {
    const inserts = Math.ceil(keystrokes / 2 / DEFAULT_INSERTS) * DEFAULT_INSERTS;
    for (let typed = 0; typed < inserts; typed += DEFAULT_INSERTS) {
      await burst({ inserts: DEFAULT_INSERTS, rendererProfile: false });
      await settle();
    }
    return inserts * 2;
  }

  /** The editor's data work without React or native, inside this V8 (editor/keystroke-bench.ts), for the same window and place as the typing. */
  function bench(siteName: string, firstLine: number, lastLine: number, keystrokes: number, warmupKeystrokes: number): string {
    const site = TYPING_SITES.find(candidate => candidate.name === siteName);
    assert(site !== undefined, `No typing site called ${siteName}`);
    const samples = runKeystrokeBench({
      source: FileAccess.getFileAsString(LAB_SOURCE), needle: site.needle, offset: site.offset, firstLine, lastLine, keystrokes, warmup: warmupKeystrokes,
      now: () => Time.getTicksUsec() / MICROSECONDS_PER_MILLISECOND,
    });
    return JSON.stringify(summarizeAll(samples));
  }

  /**
   * What a call from JS into the engine costs here: microseconds per call, for a call that returns an integer, one that returns a boolean, one that
   * returns a string and one that takes a string, each in a loop of `calls` after a warm-up.
   */
  function nativeCallCost(calls: number): string {
    const measure = (work: () => unknown): number => {
      for (let index = 0; index < calls; index += 1) work();
      const started = nowUs();
      for (let index = 0; index < calls; index += 1) work();
      return (nowUs() - started) / calls;
    };
    const costs = {
      'Time.getTicksUsec() -> int': measure(() => Time.getTicksUsec()),
      'Engine.isEditorHint() -> bool': measure(() => Engine.isEditorHint()),
      'owner.getName() -> StringName': measure(() => owner.getName()),
      'owner.isInsideTree() -> bool': measure(() => owner.isInsideTree()),
      'an empty JS function': measure(() => undefined),
    };
    return JSON.stringify(costs);
  }

  const controls = { prepare, warmup, burst, settle, bench, nativeCallCost };
  Object.assign(globalThis, {
    godotReactKeystrokeProfile: {
      ...controls,
      /** What the run is made of, for the report. */
      environment: () => JSON.stringify({ debugBuild: OS.isDebugBuild(), staticMemoryMiB: OS.getStaticMemoryUsage() / MIB }),
      finish: () => { owner.getTree()?.quit(); },
    },
  });
  console.log('GODOT_REACT_KEYSTROKE_PROFILE_READY');
  if (!userArgs.includes(STANDALONE_ARGUMENT)) return;
  const argument = (name: string): string | undefined => userArgs.find(candidate => candidate.startsWith(`--${name}=`))?.slice(name.length + 3);
  void (async () => {
    await prepare(argument('site') ?? TYPING_SITES[0]?.name ?? 'attribute');
    await warmup(Number(argument('warmup') ?? DEFAULT_WARMUP));
    const all: KeystrokeRecord[] = [];
    const inserts = Number(argument('inserts') ?? DEFAULT_INSERTS);
    for (let index = 0; index < Number(argument('bursts') ?? DEFAULT_BURSTS); index += 1) {
      all.push(...await burst({ inserts, rendererProfile: argument('renderer-profile') !== 'off' }));
      await settle();
    }
    console.log('GODOT_REACT_KEYSTROKE_PROFILE_RESULT', JSON.stringify(all));
    owner.getTree()?.quit();
  })().catch(error => {
    console.error('GODOT_REACT_KEYSTROKE_PROFILE_FAILED', error instanceof Error ? error.stack : String(error));
    owner.getTree()?.quit(1);
  });
}
