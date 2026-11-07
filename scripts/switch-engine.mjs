// Makes the installed builds the selected engine profile's, from the builds its own target directories already hold. A demo run loads the one
// install of the UI library and of the live-compile extension whichever engine it starts, so a run on the other profile is refused until they
// are that profile's (`engine.prepareNative`). When the profile's target directory holds a build of the current sources, installing it is a
// staged copy and a stamp, in seconds; this is that command. When it does not, nothing is compiled here: the build command is named.
//
//   node scripts/switch-engine.mjs [--engine=stock] [--probe | --faults]
//
// `--probe` and `--faults` switch the native library to the profile's probe or negative-controls build, as `build-native.mjs` makes them.
// Exit status 0 when every installed build is the profile's; 1 when one needs a compile (the others are installed all the same).
// docs/tracks/engine-switch.md has the decision and its table.
import { relative, resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
import { selectEngine } from './engine.mjs';
import { liveCompileLayout, switchLiveCompile } from './live-compile-build.mjs';

rejectUnknownArguments(process.argv.slice(2), { flags: ['--probe', '--faults'] });
const root = resolve(import.meta.dirname, '..');
const probe = process.argv.includes('--probe');
const faults = process.argv.includes('--faults');
// The same rule as the build: a probe build and a negative-controls build are feature sets of their own.
if (probe && faults) throw new Error('--probe and --faults are separate builds: switch to one, then the other.');
const engine = selectEngine();
const MS_PER_SECOND = 1000;

/** Run one switch and say what it did, with the time it took. Returns whether a compile is still needed. */
function report(name, switchTo, sourceOf) {
  const started = performance.now();
  const result = switchTo();
  const seconds = ((performance.now() - started) / MS_PER_SECOND).toFixed(2);
  if (result.outcome === 'current') {
    console.log(`${name}: already the ${engine.name} profile's build of the current sources (${seconds} s)`);
  } else if (result.outcome === 'installed') {
    console.log(`${name}: installed the ${engine.name} build from ${sourceOf(result)} in ${seconds} s. Before: ${result.problem}`);
  } else if (result.absent) {
    console.log(`${name}: not installed here and no ${engine.name} build in ${sourceOf(result)}, so nothing to switch (${seconds} s)`);
  } else {
    console.log(`${name}: ${result.problem} ${result.builtProblem} Run \`${result.fix}\` first.`);
    return true;
  }
  return false;
}

console.log(`Engine profile ${engine.name}: ${engine.description}`);
const needsCompile = [
  report('native library', () => engine.switchLibrary({ probe, faults }), result => relative(root, result.target)),
  report('live-compile', () => switchLiveCompile(engine), () => relative(root, liveCompileLayout(engine).targetDirectory)),
];
if (needsCompile.includes(true)) process.exitCode = 1;
