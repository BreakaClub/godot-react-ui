import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { argsWithoutEngine, selectEngine, selectEngineName } from '../scripts/engine.mjs';

test('the Web export presets of both profiles differ only in their name, path and templates', () => {
  // A setting turned on in one preset alone makes one engine's Web build behave differently for no engine reason.
  const presets = readFileSync(resolve('demo/export_presets.cfg'), 'utf8')
    .split(/^\[preset\.\d+\]$/m).slice(1)
    .map(preset => preset.split('\n')
      .filter(line => line.includes('=') && !/^(name|export_path|custom_template\/\w+)=/.test(line))
      .sort());
  assert.equal(presets.length, 2);
  assert.deepEqual(presets[1], presets[0]);
});

// The engine profile mechanism every script shares (scripts/engine.mjs): one flag, one
// variable, one default. These tests pass their own argv and environment, so nothing here touches the process's.

test('the default profile is breaka when nothing selects one', () => {
  assert.equal(selectEngineName([], {}), 'breaka');
  assert.equal(selectEngineName(['--only=events'], { GODOT_REACT_ENGINE: '' }), 'breaka');
});

test('the variable selects a profile and the flag overrides it', () => {
  assert.equal(selectEngineName([], { GODOT_REACT_ENGINE: 'stock' }), 'stock');
  assert.equal(selectEngineName(['--engine=stock'], {}), 'stock');
  assert.equal(selectEngineName(['--engine=breaka'], { GODOT_REACT_ENGINE: 'stock' }), 'breaka');
});

test('an unknown profile and conflicting flags are errors, never a silent default', () => {
  assert.throws(() => selectEngineName(['--engine=nightly'], {}), /Unknown engine profile "nightly"/u);
  assert.throws(() => selectEngineName([], { GODOT_REACT_ENGINE: 'Stock' }), /Unknown engine profile "Stock"/u);
  assert.throws(() => selectEngineName(['--engine=stock', '--engine=breaka'], {}), /Conflicting/u);
  assert.equal(selectEngineName(['--engine=stock', '--engine=stock'], {}), 'stock');
});

test('the engine flag is removed from arguments a script forwards or validates', () => {
  assert.deepEqual(argsWithoutEngine(['--engine=stock', '--probe', '--only=events']), ['--probe', '--only=events']);
});

test('a resolved profile is exported so the scripts it starts agree', () => {
  const env: Record<string, string | undefined> = {};
  assert.equal(selectEngine(['--engine=stock'], env).name, 'stock');
  assert.equal(env.GODOT_REACT_ENGINE, 'stock');
});

test('the Web builds of the two profiles bind to their own dumps and keep their caches and evidence apart', () => {
  const stock = selectEngine(['--engine=stock'], {});
  const breaka = selectEngine([], {});
  assert.match(stock.webBindingEnvironment().GDRUST_GODOT_API_JSON ?? '', /native\/api\/stock-4\.7\.2\/extension_api\.json$/u);
  assert.match(stock.webBindingEnvironment().GDRUST_GODOT_INTERFACE_JSON ?? '', /native\/api\/stock-4\.7\.2\/gdextension_interface\.json$/u);
  // Breaka's Web side module binds to Breaka's own 4.8 dump pair. Cargo's `[env]` does not override a variable a shell already exports, so the build
  // sets both itself and a pair left in the environment cannot redirect it.
  assert.match(breaka.webBindingEnvironment().GDRUST_GODOT_API_JSON ?? '', /native\/api\/extension_api\.json$/u);
  assert.match(breaka.webBindingEnvironment().GDRUST_GODOT_INTERFACE_JSON ?? '', /native\/api\/gdextension_interface\.json$/u);
  assert.doesNotMatch(breaka.webBindingEnvironment().GDRUST_GODOT_API_JSON ?? '', /native\/api\/stock/u);
  const stockTargets = Object.values(stock.targets);
  const breakaTargets = Object.values(breaka.targets);
  assert.equal(new Set([...stockTargets, ...breakaTargets]).size, stockTargets.length + breakaTargets.length);
  assert.deepEqual(Object.keys(stock.targets).sort(), ['web', 'webNothreads', 'webProbe'], 'a profile has Web target directories and no native ones');
  assert.deepEqual(Object.keys(breaka.targets).sort(), ['web', 'webProbe'], "Breaka's Web templates are threaded: its profile has no build without threads");
  assert.match(stock.artifactPath('native'), /artifacts\/stock\/native$/u);
  assert.match(breaka.artifactPath('native'), /artifacts\/native$/u);
});

test('the Web side modules are linked with the Emscripten of their own engine', () => {
  assert.match(selectEngine(['--engine=stock'], {}).web.emscripten, /godot-stock\/emsdk$/u);
  assert.match(selectEngine([], {}).web.emscripten, /emsdk-breaka-6\.0\.12-/u);
  assert.equal(selectEngine(['--engine=stock'], {}).web.lazyFunctionTable, false);
  assert.equal(selectEngine([], {}).web.lazyFunctionTable, true);
});

test('GODOT overrides the profile binary, and the stock default is its wrapper', () => {
  assert.equal(selectEngine(['--engine=stock'], {}).godot, '/Users/ben/Development/godot-stock/bin/godot-stock');
  assert.equal(selectEngine(['--engine=stock'], { GODOT: '/somewhere/godot' }).godot, '/somewhere/godot');
  assert.equal(selectEngine([], {}).godot, '/Applications/Godot48.app/Contents/MacOS/Godot');
});

test('a binary that is not the profile engine is refused before anything runs', () => {
  const wrongEngine = selectEngine([], { GODOT: '/usr/bin/true' });
  assert.throws(() => wrongEngine.verifiedVersion(), /expects Godot 4\.8\.x/u);
});

test('the Web export mode is release with --release and debug otherwise, for either profile', () => {
  for (const argv of [['--engine=stock'], []]) {
    const engine = selectEngine(argv, {});
    assert.equal(engine.webMode(['--release']), 'release');
    assert.equal(engine.webMode([]), 'debug');
  }
});
