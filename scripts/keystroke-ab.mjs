// A/B of the cost of a keystroke between builds of the library and the demo.
//
//   node scripts/keystroke-ab.mjs snapshot <name> [--replace]     keep the demo as built now (native library, bundle, imports) as a variant
//   node scripts/keystroke-ab.mjs run <variant>... [--rounds=4] [--site=attribute|function] [--bursts=25] [--warmup=100] [--move]
//                                                  [--renderer-profile=on|off] [--label=<name>] [--engine=stock]
//   node scripts/keystroke-ab.mjs report <directory>              print the tables of a run again
//
// A variant is a copy of `demo/` (an APFS clone, so it costs no space until something changes) taken right after a build: it holds the library
// and the bundle that build made, so two builds can be measured in the same minutes without rebuilding between them. `run` measures the
// variants in turn in each round, and the order reverses every round, so a slow minute on the machine does not favour one of them. Each
// measurement is one `scripts/profile-keystrokes.mjs --standalone` run: a fresh quiet window (invisible, no focus), no inspector client, the
// caret at the typing site, bursts of typed characters and as many Backspaces, press and release timed from outside around `Input.parseInputEvent`.
//
// The numbers are medians over the measured keystrokes of every round of a variant; the spread between rounds is printed beside them, because on
// a machine other work shares that spread is the honest size of what a comparison can tell.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { join, resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
import { ENGINE_FLAG, selectEngine } from './engine.mjs';

const root = resolve(import.meta.dirname, '..');
const variantsDirectory = resolve(root, 'artifacts/keystroke-speed/variants');
const runsDirectory = resolve(root, 'artifacts/keystroke-speed/runs');
const MICROSECONDS_PER_MILLISECOND = 1000;
const DEFAULT_ROUNDS = 4;
const DEFAULT_BURSTS = 25;
const DEFAULT_WARMUP = 100;
const HASH_DIGITS = 12;
const RUN_DEADLINE_MS = 420_000;
const P95 = 0.95;

const [command, ...rest] = process.argv.slice(2);
const named = rest.filter(argument => !argument.startsWith('--'));

rejectUnknownArguments(process.argv.slice(2).filter(argument => argument.startsWith('--')), {
  flags: ['--replace', '--move'],
  prefixes: ['--rounds=', '--site=', '--bursts=', '--warmup=', '--renderer-profile=', '--label='],
});

function option(name, fallback) {
  const found = process.argv.find(argument => argument.startsWith(`--${name}=`));
  return found === undefined ? fallback : found.slice(name.length + 3);
}

function git(...args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}

function sha(bytes) {
  return createHash('sha256').update(bytes).digest('hex').slice(0, HASH_DIGITS);
}

/** The newest modification time under `directory`, skipping what is not source. */
function newestSource(directory) {
  let newest = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.godot' || entry.name === 'addons' || entry.name === 'gen') continue;
    const path = join(directory, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestSource(path) : statSync(path).mtimeMs);
  }
  return newest;
}

function snapshot(name) {
  if (name === undefined) throw new Error('Usage: node scripts/keystroke-ab.mjs snapshot <name>');
  const engine = selectEngine();
  // A variant is only as good as the build it was copied from: the library must be one of the working tree's sources, and the bundle newer than them.
  engine.prepareNative();
  const demo = resolve(root, 'demo');
  const bundle = resolve(demo, '.godot/GodotJS/src/main.js');
  const built = statSync(bundle).mtimeMs;
  const edited = Math.max(newestSource(resolve(root, 'src')), newestSource(resolve(demo, 'src')));
  if (edited > built) throw new Error(`The demo bundle (${new Date(built).toISOString()}) is older than the sources (${new Date(edited).toISOString()}): run node scripts/build.mjs first`);
  const target = resolve(variantsDirectory, name);
  if (existsSync(target)) {
    if (!process.argv.includes('--replace')) throw new Error(`The variant ${name} exists; --replace to make it again`);
    rmSync(target, { recursive: true, force: true });
  }
  mkdirSync(target, { recursive: true });
  const copy = spawnSync('cp', ['-cR', demo, resolve(target, 'demo')], { encoding: 'utf8' });
  if (copy.status !== 0) throw new Error(`cp -cR failed: ${copy.stderr}`);
  rmSync(resolve(target, 'demo/override.cfg'), { force: true });
  const library = resolve(target, 'demo/addons/godot-react-ui/bin/libgodot_react_ui.dylib');
  const record = {
    name,
    head: git('rev-parse', 'HEAD').trim(),
    changes: sha(git('diff', 'HEAD', '--', 'native', 'src', 'demo/src', 'scripts')),
    library: sha(readFileSync(library)),
    bundle: sha(readFileSync(resolve(target, 'demo/.godot/GodotJS/src/main.js'))),
    madeAt: new Date().toISOString(),
  };
  writeFileSync(resolve(target, 'variant.json'), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`variant ${name}: ${JSON.stringify(record)}`);
}

// ---- Statistics ------------------------------------------------------------------------------------------------------------------------

function quantile(sorted, fraction) {
  if (sorted.length === 0) return Number.NaN;
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index];
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((total, value) => total + value, 0) / (sorted.length || 1);
  return { n: sorted.length, median: quantile(sorted, 0.5), mean, p95: quantile(sorted, P95) };
}

const sum = values => values.reduce((total, value) => total + value, 0);

/** What one press or release cost, from its digest: the renderer's and the native library's own timers, in milliseconds. */
function digestParts(digest) {
  if (digest === null) return { events: 0, commit: 0, layout: 0, mount: 0, geometry: 0, paint: 0, native: 0 };
  return {
    events: sum(digest.events),
    commit: sum(digest.flushes.map(flush => flush[2])),
    layout: sum(digest.batches.map(batch => batch[3])) / MICROSECONDS_PER_MILLISECOND,
    mount: sum(digest.batches.map(batch => batch[2])) / MICROSECONDS_PER_MILLISECOND,
    geometry: sum(digest.batches.map(batch => batch[4])) / MICROSECONDS_PER_MILLISECOND,
    paint: sum(digest.draws) / MICROSECONDS_PER_MILLISECOND,
    native: sum(digest.batches.map(batch => batch[5])) / MICROSECONDS_PER_MILLISECOND,
  };
}

function keystrokeCosts(record) {
  const press = digestParts(record.press);
  const release = digestParts(record.release);
  const total = (record.pressUs + record.releaseUs) / MICROSECONDS_PER_MILLISECOND;
  return {
    total,
    events: press.events + release.events,
    commit: press.commit + release.commit,
    native: press.native + release.native,
    layout: press.layout + release.layout,
    mount: press.mount + release.mount,
    geometry: press.geometry + release.geometry,
    paint: press.paint + release.paint,
  };
}

const KINDS = [['insert', ['insert']], ['delete', ['delete']], ['typed + deleted', ['insert', 'delete']], ['right', ['right']], ['left', ['left']], ['caret move', ['right', 'left']]];
const FIELDS = ['total', 'events', 'commit', 'native', 'layout', 'mount', 'geometry', 'paint'];

function costsOf(records, kinds) {
  return records.filter(record => kinds.includes(record.kind)).map(keystrokeCosts);
}

function fixed(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

function describeRun(label, runs) {
  // runs: [{ variant, round, records }]
  const variants = [...new Set(runs.map(run => run.variant))];
  const lines = [`### ${label}`, ''];
  for (const [kindName, kinds] of KINDS) {
    const present = runs.some(run => run.records.some(record => kinds.includes(record.kind)));
    if (!present) continue;
    lines.push(`**${kindName}**, press + release, milliseconds`, '');
    lines.push('| variant | n | median | mean | p95 | median per round | of the median: events / commit call / native layout / paint |');
    lines.push('| --- | ---: | ---: | ---: | ---: | --- | --- |');
    for (const variant of variants) {
      const mine = runs.filter(run => run.variant === variant);
      const all = mine.flatMap(run => costsOf(run.records, kinds));
      const total = summarize(all.map(cost => cost.total));
      const perRound = mine.map(run => fixed(summarize(costsOf(run.records, kinds).map(cost => cost.total)).median, 2)).join(' / ');
      const part = field => fixed(summarize(all.map(cost => cost[field])).median, 2);
      lines.push(`| ${variant} | ${total.n} | **${fixed(total.median, 3)}** | ${fixed(total.mean, 3)} | ${fixed(total.p95, 3)} | ${perRound} | ${part('events')} / ${part('commit')} / ${part('layout')} / ${part('paint')} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ---- Runs ------------------------------------------------------------------------------------------------------------------------------

function measure(variant, round, directory, settings) {
  const out = resolve(directory, `round${round}-${variant}`);
  const demo = resolve(variantsDirectory, variant, 'demo');
  if (!existsSync(demo)) throw new Error(`No variant ${variant}: node scripts/keystroke-ab.mjs snapshot ${variant}`);
  const args = [
    resolve(root, 'scripts/profile-keystrokes.mjs'), '--standalone', `--demo=${demo}`, `--site=${settings.site}`, `--bursts=${settings.bursts}`,
    `--warmup=${settings.warmup}`, `--renderer-profile=${settings.rendererProfile}`, `--out=${out}`,
    ...settings.move ? ['--move'] : [],
    ...process.argv.filter(argument => argument.startsWith(ENGINE_FLAG)),
  ];
  const started = Date.now();
  const result = spawnSync('node', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, timeout: RUN_DEADLINE_MS });
  writeFileSync(`${out}.log`, `${result.stdout}\n${result.stderr}`);
  if (result.status !== 0) throw new Error(`The run of ${variant} (round ${round}) failed (${result.status}${result.signal === null ? '' : `, ${result.signal}`}); see ${out}.log`);
  const records = JSON.parse(readFileSync(resolve(out, 'records.json'), 'utf8'));
  console.log(`round ${round} ${variant}: ${records.length} keystrokes in ${((Date.now() - started) / 1000).toFixed(0)} s, load ${loadavg().map(value => value.toFixed(1)).join(' ')}`);
  return { variant, round, records, load: loadavg()[0] };
}

function run(variants) {
  if (variants.length === 0) throw new Error('Usage: node scripts/keystroke-ab.mjs run <variant>... [--rounds=4]');
  const settings = {
    site: option('site', 'attribute'),
    bursts: Number(option('bursts', DEFAULT_BURSTS)),
    warmup: Number(option('warmup', DEFAULT_WARMUP)),
    rendererProfile: option('renderer-profile', 'on'),
    move: process.argv.includes('--move'),
  };
  const rounds = Number(option('rounds', DEFAULT_ROUNDS));
  const label = option('label', `${new Date().toISOString().replaceAll(':', '').slice(0, 15)}-${variants.join('-vs-')}`);
  const directory = resolve(runsDirectory, label);
  mkdirSync(directory, { recursive: true });
  const runs = [];
  for (let round = 0; round < rounds; round += 1) {
    // The order reverses in every other round.
    const order = round % 2 === 0 ? variants : [...variants].reverse();
    for (const variant of order) runs.push(measure(variant, round, directory, settings));
  }
  writeFileSync(resolve(directory, 'settings.json'), `${JSON.stringify({ variants, rounds, ...settings, loads: runs.map(entry => [entry.variant, entry.round, entry.load]) }, null, 2)}\n`);
  report(directory, runs);
}

function report(directory, loaded) {
  const runs = loaded ?? readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => {
    const match = /^round(\d+)-(.+)$/u.exec(entry.name);
    return { variant: match[2], round: Number(match[1]), records: JSON.parse(readFileSync(resolve(directory, entry.name, 'records.json'), 'utf8')) };
  });
  const text = describeRun(directory.split('/').pop(), runs);
  console.log(text);
  writeFileSync(resolve(directory, 'report.md'), `${text}\n`);
}

switch (command) {
  case 'snapshot': snapshot(named[0]); break;
  case 'run': run(named); break;
  case 'report': report(resolve(named[0] ?? runsDirectory)); break;
  default: throw new Error('Usage: node scripts/keystroke-ab.mjs snapshot <name> | run <variant>... | report <directory>');
}
