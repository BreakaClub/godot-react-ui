import assert from 'node:assert/strict';
import { test } from 'node:test';
import { argsWithoutEngine, selectEngine, selectEngineName } from '../scripts/engine.mjs';

// The engine profile mechanism every script shares (scripts/engine.mjs, docs/tracks/stock-engine.md): one flag, one
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

test('the stock profile binds to its own dumps and keeps its caches and evidence apart', () => {
  const stock = selectEngine(['--engine=stock'], {});
  const breaka = selectEngine([], {});
  assert.match(stock.bindingEnvironment().GDRUST_GODOT_API_JSON ?? '', /native\/api\/stock-4\.7\.2\/extension_api\.json$/u);
  assert.match(stock.bindingEnvironment().GDRUST_GODOT_INTERFACE_JSON ?? '', /native\/api\/stock-4\.7\.2\/gdextension_interface\.json$/u);
  // The default profile leaves cargo's own `.cargo/config.toml` selection alone.
  assert.deepEqual(breaka.bindingEnvironment(), {});
  const stockTargets = Object.values(stock.targets);
  const breakaTargets = Object.values(breaka.targets);
  assert.equal(new Set([...stockTargets, ...breakaTargets]).size, stockTargets.length + breakaTargets.length);
  assert.match(stock.artifactPath('native'), /artifacts\/stock\/native$/u);
  assert.match(breaka.artifactPath('native'), /artifacts\/native$/u);
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
