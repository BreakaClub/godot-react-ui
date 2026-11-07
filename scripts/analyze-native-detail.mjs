// Reads the `KEYSTROKE_DETAIL` lines a measuring native build prints (scripts/keystroke-experiments/native-detail.patch) from the log of a profile run, and
// prints the native commit's phases per keystroke (docs/tracks/keystroke-profile.md):
//
//   node scripts/analyze-native-detail.mjs <run directory>... [--kind=insert|delete]
//
// Each profiled keystroke takes the native profile three times (before the press, after the press, after the release), so the lines come in
// threes and the second of each is the press. A timer is inclusive of the timers inside it (their names say where they nest).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MEDIAN = 0.5;
const PERCENTILE_95 = 0.95;
const NANOS_PER_MICRO = 1000;
const PER_KEYSTROKE = 3;
const PRESS = 1;
const directories = process.argv.slice(2).filter(argument => !argument.startsWith('--')).map(argument => resolve(argument));
const kind = process.argv.find(argument => argument.startsWith('--kind='))?.slice('--kind='.length);

const presses = [];
for (const directory of directories) {
  const lines = readFileSync(resolve(directory, 'run.log'), 'utf8').split('\n').filter(line => line.includes('KEYSTROKE_DETAIL '));
  const records = JSON.parse(readFileSync(resolve(directory, 'records.json'), 'utf8'));
  if (lines.length !== records.length * PER_KEYSTROKE) throw new Error(`${directory}: ${lines.length} detail lines for ${records.length} keystrokes`);
  records.forEach((record, index) => {
    if (kind !== undefined && record.kind !== kind) return;
    const line = lines[index * PER_KEYSTROKE + PRESS];
    presses.push(JSON.parse(line.slice(line.indexOf('KEYSTROKE_DETAIL ') + 'KEYSTROKE_DETAIL '.length)));
  });
}
const names = [...new Set(presses.flatMap(press => Object.keys(press)))].sort();
const stat = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const at = share => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))];
  return { median: at(MEDIAN), mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length, p95: at(PERCENTILE_95) };
};
console.log(`${presses.length} presses${kind === undefined ? '' : ` (${kind})`}\n`);
console.log('| Timer (inclusive) | median us | mean us | p95 us | times per press (median) |');
console.log('| --- | ---: | ---: | ---: | ---: |');
for (const name of names) {
  const nanos = presses.map(press => press[name]?.[0] ?? 0);
  const times = presses.map(press => press[name]?.[1] ?? 0);
  const micros = stat(nanos.map(value => value / NANOS_PER_MICRO));
  const counted = nanos.every(value => value === 0);
  console.log(`| ${name} | ${counted ? '' : micros.median.toFixed(1)} | ${counted ? '' : micros.mean.toFixed(1)} | ${counted ? '' : micros.p95.toFixed(1)} | ${stat(times).median} |`);
}
