// Reads what `scripts/profile-keystrokes.mjs` wrote (docs/tracks/keystroke-profile.md) and prints Markdown tables:
//
//   node scripts/analyze-keystroke-profile.mjs <directory>... [--top=40] [--json=<file>]
//
// Several directories (repeated runs of one configuration) are analysed as one.
//
// - From the V8 CPU profiles (`profile-NN.cpuprofile`, one per burst): the time of the keystrokes by phase (every sample goes to exactly one
//   phase, so the phases add up), the hottest functions by self and by total time, and what ran outside the keystrokes during a burst.
//   Frames are named by their original source file and line through the bundle's source map.
// - From `records.json`: the renderer profiler's and the native profiler's numbers for each keystroke (median, mean, 95th percentile).
// - From the precise coverage (`coverage-NN.json`): how many times each function ran per keystroke.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { SourceMap } from 'node:module';
import { resolve, relative } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const directories = process.argv.slice(2).filter(argument => !argument.startsWith('--')).map(argument => resolve(argument));
if (directories.length === 0) throw new Error('Usage: node scripts/analyze-keystroke-profile.mjs <directory>... [--top=40] [--json=<file>]');
const [directory] = directories;
const top = Number(process.argv.find(argument => argument.startsWith('--top='))?.slice('--top='.length) ?? 40);
const jsonOut = process.argv.find(argument => argument.startsWith('--json='))?.slice('--json='.length);
const MICROSECONDS_PER_MILLISECOND = 1000;
/**
 * The longest a sample is credited with, in typical intervals. The sampler's ticks come one or two intervals apart inside the keystrokes (42 and 83
 * microseconds for the 25 asked for: the platform rounds the interval up), but it stalls now and then for milliseconds, and DevTools' convention
 * (a sample lasts until the next one) would credit the whole stall to whichever stack came before it. A stall is not the program's time.
 */
const MAX_SAMPLE_INTERVALS = 2.5;

// ---- Source maps ------------------------------------------------------------------------------------------------------------------------

const maps = new Map();
function mapFor(url) {
  if (!maps.has(url)) {
    const file = url.startsWith('/') ? `${url}.map` : undefined;
    maps.set(url, file !== undefined && existsSync(file) ? new SourceMap(JSON.parse(readFileSync(file, 'utf8'))) : undefined);
  }
  return maps.get(url);
}

/** The original file, shortened: a package's own path under `node_modules`, a project file relative to the repository. */
function shortSource(source) {
  const cleaned = source.replace(/^file:\/\//u, '');
  const at = cleaned.lastIndexOf('node_modules/');
  if (at >= 0) return cleaned.slice(at + 'node_modules/'.length);
  const absolute = cleaned.startsWith('/') ? cleaned : resolve(root, 'demo/.godot/GodotJS/src', cleaned);
  return relative(root, absolute);
}

const frameCache = new Map();
/** What a profile node's call frame is, in original coordinates. */
function frameOf(callFrame) {
  const key = `${callFrame.functionName}|${callFrame.url}|${callFrame.lineNumber}|${callFrame.columnNumber}`;
  let found = frameCache.get(key);
  if (found !== undefined) return found;
  let name = callFrame.functionName === '' ? '(anonymous)' : callFrame.functionName;
  let file = callFrame.url === '' ? '(native)' : shortSource(callFrame.url);
  let line = callFrame.lineNumber + 1;
  const map = callFrame.url === '' ? undefined : mapFor(callFrame.url);
  const entry = map?.findEntry(callFrame.lineNumber, callFrame.columnNumber);
  if (entry !== undefined && entry.originalSource !== undefined) {
    file = shortSource(entry.originalSource);
    line = entry.originalLine + 1;
    // The bundler renames a function that shares its name with another one in the bundle (`keyEvent2`); the map keeps the name written.
    if (callFrame.functionName !== '' && typeof entry.name === 'string' && entry.name !== '') name = entry.name;
  }
  found = { name, file, line, id: `${name} ${file}:${line}`, native: callFrame.url === '' };
  frameCache.set(key, found);
  return found;
}

// ---- Phases -----------------------------------------------------------------------------------------------------------------------------

const isPackage = (frame, prefix) => frame.file.startsWith(prefix);
const inFile = (frame, suffix) => frame.file.endsWith(suffix);
const named = (frame, ...names) => names.includes(frame.name);
const REACT = 'react-reconciler/';
const HARNESS_ENTRY = ['parseVerifierEvent', 'characterEvent', 'keyEvent', 'leftButton'];

/**
 * The phases, in the order they are tried against the frames of a sample from the leaf up: the first frame that fits one claims the sample.
 * A phase is a name and a test of one frame. The leaf-most claim wins, so a sample inside the highlighter that was called from a React
 * component belongs to the highlighter and not to React, and the time that no inner phase claims goes to the outermost one it is in.
 *
 * A native frame is named by the JS function that called it (see `stackOf`): the profiler names a native callback after the exported symbol
 * nearest to the sampled address, which is a different wrong name from one sample to the next.
 */
const PHASES = [
  ['GC', frame => frame.name === '(garbage collector)'],
  ['harness: the demo\'s _input and _unhandledInput, the verifier\'s isolation (not the library)', frame => named(frame, '_input', '_unhandledInput', 'rejects', 'track', 'notify') && (frame.file === 'demo/src/main.ts' || inFile(frame, 'verifier-input.ts'))
    || inFile(frame, 'demo/src/verifier-input.ts') || inFile(frame, 'demo/src/profile-keystrokes.ts')],
  ['instrumentation: the renderer profiler (src/profile.ts, its clock)', frame => inFile(frame, 'src/profile.ts') || frame.name === 'now' && frame.file === 'demo/src/main.ts' || frame.nativeFrom === 'now'],
  ['native commit call (host.commit)', frame => frame.nativeFrom === 'commitPayload'],
  ['commit: JSON encode', frame => named(frame, 'stringify') && frame.parent === 'commitPayload'],
  ['commit: the walk (buildCommit)', frame => named(frame, 'buildCommit') || inFile(frame, 'src/commit.ts')],
  ['commit: after the call (freeze, deletions)', frame => named(frame, 'commitLayer', 'commitPayload') || frame.nativeFrom === 'readDeletions'],
  ['native readEvents (drainEvents + JSON.parse)', frame => named(frame, 'readEvents', 'nativeEvent') || frame.nativeFrom === 'readEvents'],
  ['native resolveEvent (answers the blocked native key handler)', frame => named(frame, 'resolveEvent') || frame.nativeFrom === 'resolveEvent'],
  ['highlight (lezer highlightTree, colour spans)', frame => isPackage(frame, '@lezer/highlight') || inFile(frame, 'demo/src/editor/highlight.ts') && named(frame, 'colorSpans', 'spans', 'sameSpans')],
  ['parse (lezer incremental parse inside the transaction)', frame => isPackage(frame, '@lezer/lr') || isPackage(frame, '@lezer/common') || isPackage(frame, '@lezer/javascript')
    || isPackage(frame, '@codemirror/language') && !named(frame, 'matchBrackets', 'matchPlainBrackets', 'findHandle', 'indentOnInput')
    || inFile(frame, 'demo/src/editor/highlight.ts') && named(frame, 'treeFor')],
  ['CodeMirror transaction (state, commands, history, brackets)', frame => isPackage(frame, '@codemirror/state') || isPackage(frame, '@codemirror/commands') || named(frame, 'matchBrackets', 'matchPlainBrackets', 'findHandle', 'indentOnInput')],
  ['editor: lines (buildLine, line layout, caches)', frame => inFile(frame, 'demo/src/editor/lines.ts') || inFile(frame, 'demo/src/editor/line-layout.ts')
    || inFile(frame, 'demo/src/editor/controller.ts') && named(frame, 'lines', 'layoutOf', 'caretPlacements')],
  ['editor: controller, commands, keymap, model', frame => frame.file.startsWith('demo/src/editor/') && !frame.file.includes('/view/')],
  ['React: host props (nativeProps, compileStyle)', frame => inFile(frame, 'src/styles.ts') || inFile(frame, 'src/props.ts') || frame.file.startsWith('src/utilities/') || named(frame, 'nativeProps', 'compileStyle')],
  ['React: render (components and the render phase)', frame => frame.file.includes(REACT) && named(frame, 'renderRootSync', 'beginWork', 'completeWork', 'renderWithHooks', 'completeUnitOfWork', 'reconcileChildren', 'updateFunctionComponent', 'workLoopSync', 'performUnitOfWork', 'updateHostComponent', 'bailoutOnAlreadyFinishedWork')
    || frame.file.startsWith('demo/') || inFile(frame, 'src/components.tsx')],
  ['React: commit phase (mutation, layout effects, passive effects)', frame => frame.file.includes(REACT) && named(frame, 'commitRoot', 'commitRootWhenReady', 'flushMutationEffects', 'flushLayoutEffects', 'flushPassiveEffects', 'commitMutationEffectsOnFiber', 'commitLayoutEffectOnFiber', 'commitPassiveMountEffects', 'flushSpawnedWork')
    || named(frame, 'replaceContainerChildren')],
  ['renderer: event dispatch (processEvent, dispatch, handlers, propagation)', frame => inFile(frame, 'src/renderer.ts') || inFile(frame, 'src/events.ts')],
  ['reconciler other (scheduling, flushSyncWork)', frame => frame.file.includes(REACT)],
  ['native: other calls into the engine (from JS)', frame => frame.native && frame.nativeFrom !== undefined && !HARNESS_ENTRY.includes(frame.nativeFrom)],
  ['native: Input.parseInputEvent outside JS (the engine routes the key, ReactUiRoot turns it into events)', frame => frame.native],
];

function classify(frames) {
  // `frames` is root first.
  for (let index = frames.length - 1; index >= 0; index -= 1) {
    const frame = { ...frames[index], parent: frames[index - 1]?.name };
    for (const [name, test] of PHASES) {
      if (test(frame)) return name;
    }
  }
  return 'other';
}

// ---- Profiles ---------------------------------------------------------------------------------------------------------------------------

function loadProfiles() {
  return directories.flatMap(each => readdirSync(each).filter(name => /^profile-\d+\.cpuprofile$/u.test(name)).sort()
    .map(name => JSON.parse(readFileSync(resolve(each, name), 'utf8'))));
}

function loadRecords() {
  return directories.flatMap(each => (existsSync(resolve(each, 'records.json')) ? JSON.parse(readFileSync(resolve(each, 'records.json'), 'utf8')) : []));
}

/** Every sample of a profile with its stack of frames (root first) and its duration in microseconds (DevTools' convention: until the next sample). */
function* samplesOf(profile) {
  const intervals = profile.timeDeltas.slice(1).sort((a, b) => a - b);
  const typical = intervals[Math.floor(intervals.length / 2)] ?? 0;
  const longest = MAX_SAMPLE_INTERVALS * typical;
  const byId = new Map(profile.nodes.map(node => [node.id, node]));
  const parents = new Map();
  for (const node of profile.nodes) for (const child of node.children ?? []) parents.set(child, node.id);
  const stacks = new Map();
  const stackOf = id => {
    let found = stacks.get(id);
    if (found === undefined) {
      const parent = parents.get(id);
      const above = parent === undefined ? [] : stackOf(parent);
      let frame = frameOf(byId.get(id).callFrame);
      // A native frame is the native function the JS function above it called, whatever symbol the profiler guessed for the sampled address.
      if (frame.native && !frame.name.startsWith('(') && above.length > 0) {
        const caller = above.at(-1);
        frame = { ...frame, name: `native call from ${caller.name}`, id: `(native call from ${caller.name}) ${caller.file}:${caller.line}`, nativeFrom: caller.name };
      }
      found = [...above, frame];
      stacks.set(id, found);
    }
    return found;
  };
  for (let index = 0; index < profile.samples.length; index += 1) {
    const duration = index + 1 < profile.timeDeltas.length ? Math.min(profile.timeDeltas[index + 1], longest) : 0;
    yield { stack: stackOf(profile.samples[index]), duration };
  }
}

const DRIVER_FILE = 'demo/src/profile-keystrokes.ts';
const KEY_FUNCTIONS = ['characterEvent', 'keyEvent'];

function fmt(value, digits = 3) {
  return value.toFixed(digits);
}

function table(headers, rows) {
  const lines = [`| ${headers.join(' | ')} |`, `| ${headers.map((_, index) => (index === 0 ? '---' : '---:')).join(' | ')} |`];
  for (const row of rows) lines.push(`| ${row.join(' | ')} |`);
  return lines.join('\n');
}

function analyseProfiles(keystrokes) {
  const profiles = loadProfiles();
  if (profiles.length === 0) return undefined;
  const phases = new Map();
  const self = new Map();
  const total = new Map();
  const outside = new Map();
  let inKeys = 0;
  let outsideKeys = 0;
  let wall = 0;
  let sampleCount = 0;
  for (const profile of profiles) {
    wall += profile.endTime - profile.startTime;
    for (const { stack, duration } of samplesOf(profile)) {
      sampleCount += 1;
      const keyAt = stack.findIndex(frame => frame.file === DRIVER_FILE && KEY_FUNCTIONS.includes(frame.name));
      if (keyAt < 0) {
        outsideKeys += duration;
        const leaf = stack.at(-1);
        const root = stack[1] ?? stack[0];
        const label = leaf.name.startsWith('(') ? leaf.name : `${root.name} ${root.file}:${root.line}`;
        outside.set(label, (outside.get(label) ?? 0) + duration);
        continue;
      }
      inKeys += duration;
      // From the injection function itself, so that building the InputEvent (self time of `characterEvent`) is the harness's.
      const inside = stack.slice(keyAt);
      const phase = classify(inside);
      phases.set(phase, (phases.get(phase) ?? 0) + duration);
      const leaf = stack.at(-1);
      self.set(leaf.id, (self.get(leaf.id) ?? 0) + duration);
      for (const id of new Set(inside.slice(1).map(frame => frame.id))) total.set(id, (total.get(id) ?? 0) + duration);
    }
  }
  const per = value => value / keystrokes / MICROSECONDS_PER_MILLISECOND;
  const output = [];
  output.push(`CPU profiles: ${profiles.length}, ${sampleCount} samples, ${fmt(wall / MICROSECONDS_PER_MILLISECOND / 1000, 1)} s of profile; ${keystrokes} keystrokes.`);
  output.push(`Inside the key injection: ${fmt(per(inKeys))} ms per keystroke; the rest of the burst (frames between keys, timers, the driver): ${fmt(per(outsideKeys))} ms per keystroke.`);
  const phaseRows = [...phases].sort((a, b) => b[1] - a[1]).map(([name, value]) => [name, fmt(per(value)), `${fmt((value / inKeys) * 100, 1)} %`]);
  output.push(`\n### Phases (each sample in exactly one)\n\n${table(['Phase', 'ms per keystroke', 'Share'], [...phaseRows, ['**Total**', `**${fmt(per(inKeys))}**`, '100 %']])}`);
  const rowsOf = (map, limit) => [...map].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id, value]) => [`\`${id}\``, fmt(per(value)), `${fmt((value / inKeys) * 100, 1)} %`]);
  output.push(`\n### Functions by self time\n\n${table(['Function', 'ms per keystroke', 'Share'], rowsOf(self, top))}`);
  output.push(`\n### Functions by total (inclusive) time\n\n${table(['Function', 'ms per keystroke', 'Share'], rowsOf(total, top))}`);
  output.push(`\n### What ran outside the key injection (per keystroke, in the profiled bursts)\n\n${table(['Root', 'ms per keystroke'], [...outside].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, value]) => [`\`${name}\``, fmt(per(value))]))}`);
  return { text: output.join('\n'), phases: Object.fromEntries([...phases].map(([name, value]) => [name, per(value)])), perKeystrokeMs: per(inKeys) };
}

// ---- The profilers' records -------------------------------------------------------------------------------------------------------------

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = share => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))];
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return { n: sorted.length, min: sorted[0], median: at(0.5), mean, p95: at(0.95), max: sorted.at(-1) };
}

function analyseRecords() {
  const records = loadRecords();
  if (records.length === 0) return undefined;
  const sum = values => values.reduce((total, value) => total + value, 0);
  const output = [];
  const rows = [];
  const measures = {};
  for (const kind of ['insert', 'delete']) {
    const of = records.filter(record => record.kind === kind);
    if (of.length === 0) continue;
    const profiled = of.filter(record => record.press !== null);
    const columns = {
      'parseInputEvent(press), ms': of.map(record => record.pressUs / 1000),
      'parseInputEvent(release), ms': of.map(record => record.releaseUs / 1000),
      'press + release, ms': of.map(record => (record.pressUs + record.releaseUs) / 1000),
    };
    if (profiled.length > 0) {
      Object.assign(columns, {
        'events (all samples of the press), ms': profiled.map(record => sum(record.press.events)),
        'events: largest sample of the press, ms': profiled.map(record => Math.max(...record.press.events)),
        'events samples per press': profiled.map(record => record.press.events.length),
        'flush (commit), ms': profiled.map(record => sum(record.press.flushes.map(flush => flush[3]))),
        'flush: walk, ms': profiled.map(record => sum(record.press.flushes.map(flush => flush[0]))),
        'flush: JSON, ms': profiled.map(record => sum(record.press.flushes.map(flush => flush[1]))),
        'flush: native call, ms': profiled.map(record => sum(record.press.flushes.map(flush => flush[2]))),
        'commits per press': profiled.map(record => record.press.flushes.length),
        'nodes visited': profiled.map(record => sum(record.press.flushes.map(flush => flush[4]))),
        'commands': profiled.map(record => sum(record.press.flushes.map(flush => flush[5]))),
        'JSON chars': profiled.map(record => sum(record.press.flushes.map(flush => flush[6]))),
        'native batch total, us': profiled.map(record => sum(record.press.batches.map(batch => batch[5]))),
        'native: parse, us': profiled.map(record => sum(record.press.batches.map(batch => batch[0]))),
        'native: validate (plan + style dry run), us': profiled.map(record => sum(record.press.batches.map(batch => batch[1]))),
        'native: mount (apply, styles, text), us': profiled.map(record => sum(record.press.batches.map(batch => batch[2]))),
        'native: layout, us': profiled.map(record => sum(record.press.batches.map(batch => batch[3]))),
        'native: geometry, us': profiled.map(record => sum(record.press.batches.map(batch => batch[4]))),
        'release: events, ms': profiled.map(record => sum(record.release.events)),
      });
      if (profiled[0].press.draws !== undefined) {
        Object.assign(columns, {
          'native: paint pass (draw), us': profiled.map(record => sum(record.press.draws)),
          'native frame samples during the press': profiled.map(record => record.press.frames),
        });
        for (const name of Object.keys(profiled[0].press.counted)) columns[`native counter: ${name}`] = profiled.map(record => record.press.counted[name]);
      }
    }
    measures[kind] = Object.fromEntries(Object.entries(columns).map(([name, values]) => [name, stats(values)]));
    for (const [name, values] of Object.entries(columns)) {
      const found = stats(values);
      rows.push([kind, name, found.n, fmt(found.min), fmt(found.median), fmt(found.mean), fmt(found.p95), fmt(found.max)]);
    }
  }
  output.push(`### The renderer's and the native library's own profilers (${records.length} keystrokes)\n\n${table(['Key', 'Measure', 'n', 'min', 'median', 'mean', 'p95', 'max'], rows)}`);
  return { text: output.join('\n'), measures };
}

// ---- Precise coverage: call counts --------------------------------------------------------------------------------------------------------

function analyseCoverage(keystrokes) {
  const files = directories.flatMap(each => readdirSync(each).filter(name => /^coverage-\d+\.json$/u.test(name)).sort().map(name => resolve(each, name)));
  if (files.length === 0) return undefined;
  const counts = new Map();
  for (const file of files) {
    const taken = JSON.parse(readFileSync(file, 'utf8'));
    for (const script of taken.result) {
      if (!script.url.endsWith('/main.js')) continue;
      const map = mapFor(script.url);
      const source = readFileSync(script.url, 'utf8');
      const starts = [0];
      for (let index = 0; index < source.length; index += 1) if (source.charCodeAt(index) === 10) starts.push(index + 1);
      const position = offset => {
        let low = 0;
        let high = starts.length - 1;
        while (low < high) {
          const mid = (low + high + 1) >> 1;
          if (starts[mid] <= offset) low = mid; else high = mid - 1;
        }
        return { line: low, column: offset - starts[low] };
      };
      for (const fn of script.functions) {
        const count = fn.ranges[0]?.count ?? 0;
        if (count === 0) continue;
        const at = position(fn.ranges[0].startOffset);
        const entry = map?.findEntry(at.line, at.column);
        const file = entry?.originalSource === undefined ? 'main.js' : shortSource(entry.originalSource);
        const line = entry?.originalSource === undefined ? at.line + 1 : entry.originalLine + 1;
        const id = `${fn.functionName === '' ? '(anonymous)' : fn.functionName} ${file}:${line}`;
        counts.set(id, (counts.get(id) ?? 0) + count);
      }
    }
  }
  const wanted = ([id]) => /demo\/src\/|^src\/|react-reconciler|@codemirror|@lezer/u.test(id);
  const rows = [...counts].filter(wanted).sort((a, b) => b[1] - a[1]).slice(0, top * 2).map(([id, count]) => [`\`${id}\``, fmt(count / keystrokes, 2)]);
  return { text: `### Calls per keystroke (precise coverage over ${keystrokes} keystrokes)\n\n${table(['Function', 'calls per keystroke'], rows)}`, counts: Object.fromEntries(counts) };
}

// ---- Output -----------------------------------------------------------------------------------------------------------------------------

const meta = existsSync(resolve(directory, 'meta.json')) ? JSON.parse(readFileSync(resolve(directory, 'meta.json'), 'utf8')) : {};
const keystrokes = loadRecords().length;
const records = analyseRecords();
const profiles = analyseProfiles(keystrokes);
const coverage = analyseCoverage(keystrokes);
console.log(`## ${directories.map(each => relative(root, each)).join(', ')}\n\n\`${JSON.stringify(meta)}\`\n`);
for (const part of [records, profiles, coverage]) if (part !== undefined) console.log(`${part.text}\n`);
if (jsonOut !== undefined) writeFileSync(resolve(jsonOut), JSON.stringify({ meta, records: records?.measures, phases: profiles?.phases, perKeystrokeMs: profiles?.perKeystrokeMs }, null, 2));
