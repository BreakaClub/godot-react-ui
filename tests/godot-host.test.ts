import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { createElement as h, useState } from 'react';
import {
  Button, createRoot, readActivity, registerFontFace, registerMaterial, registerTexture, takeNativeProfile,
  type FontFaceHost, type GodotNamed, type ImageHost, type NativeDiagnosticsHost,
} from '../src';
import { GODOT_NAMES, bindNativeHost } from '../src/godot-host';
import type { NativeHost } from '../src/native';
import { NO_SUBSCRIPTION, RecordingHost } from './recording-host';
import { proxyOf, readsThrough } from './support/godot-lib-api';

// A project's GodotJS gives a `ReactUiRoot`'s methods Godot's names or camel-cased ones (src/godot-host.ts). The library is held here to
// working on either, to the table of names agreeing with native and with the engine's camel-casing, and to calling a root directly where
// it is handed `godot.lib.api`'s proxy of one.

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 1000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, 'Timed out waiting for React scheduler');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

const CAMEL_OF = new Map<string, string>(Object.entries(GODOT_NAMES).map(([camel, godot]) => [godot, camel]));
/** The camel-cased names that are not also Godot's (`commit` is both). */
const CAMEL_ONLY = new Set(Object.entries(GODOT_NAMES).filter(([camel, godot]) => camel !== godot).map(([camel]) => camel));

/**
 * `host` as a project without camel-case bindings has it: each method answers to its Godot name and not to its camel-cased one, and
 * every other member (`size`) is where it was.
 */
function godotNamed<Host extends object>(host: Host): GodotNamed<Host> {
  const named = new Proxy(host, {
    has: (target, key) => !(typeof key === 'string' && CAMEL_ONLY.has(key)) && Reflect.has(target, typeof key === 'string' ? CAMEL_OF.get(key) ?? key : key),
    get(target, key) {
      if (typeof key === 'string' && CAMEL_ONLY.has(key)) return undefined;
      const value: unknown = Reflect.get(target, typeof key === 'string' ? CAMEL_OF.get(key) ?? key : key);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  // The cast: the proxy renames the host's members by the table that `GodotNamed` renames its keys by, which a `Proxy`'s type (its
  // target's) cannot say.
  return named as GodotNamed<Host>;
}

/** GodotJS's `NamingUtil::snake_to_camel_case` for a method name: lower-case words joined by single underscores. */
function camelCased(godotName: string): string {
  // `pascal_case_part_overrides` (internal/jsb_naming_util.cpp), as far as a method name of ours could meet it.
  const overrides = new Map([['id', 'Id'], ['io', 'IO'], ['ip', 'IP'], ['js', 'JS'], ['uv', 'UV'], ['xr', 'XR'], ['fx', 'FX'], ['aa', 'AA'], ['ao', 'AO'], ['gi', 'GI'], ['iv', 'IV'], ['wm', 'WM']]);
  return godotName.split('_').map((part, index) => {
    const word = overrides.get(part) ?? part.replace(/(?<=\d)[a-z]/gu, letter => letter.toUpperCase());
    const first = word.charAt(0);
    return (index === 0 ? first.toLowerCase() : first.toUpperCase()) + word.slice(1);
  }).join('');
}

test('each method\'s Godot name is a #[func] of native, and GodotJS camel-cases it to the name the library calls', () => {
  const native = readFileSync(join(__dirname, '..', 'native', 'lib.rs'), 'utf8');
  const funcs = new Set([...native.matchAll(/#\[func\]\s+fn (\w+)\(/gu)].map(match => match[1]));
  assert.ok(funcs.size > 40, `read ${funcs.size} #[func]s from native/lib.rs`);
  for (const [camel, godot] of Object.entries(GODOT_NAMES)) {
    assert.ok(funcs.has(godot), `${godot} is not a #[func] in native/lib.rs`);
    assert.equal(camelCased(godot), camel, `GodotJS's name for ${godot}`);
  }
  assert.equal(camelCased('find_by_test_id'), 'findByTestId', 'the engine writes ID as Id');
  assert.equal(new Set(Object.values(GODOT_NAMES)).size, Object.keys(GODOT_NAMES).length, 'no two methods share a Godot name');
});

/** A call of each method of `NativeHost`, with arguments that tell its parameters apart. A new method fails to compile until it is here. */
const CALLS: { [Key in Exclude<keyof NativeHost, 'size'>]: Parameters<NativeHost[Key]> } = {
  commit: [1, '{"payload":true}'],
  takeCommitDeletions: [],
  drainEvents: [],
  getSnapshot: [],
  getNodeRect: [11],
  findByTestId: ['save'],
  setPointerCapture: [12, 3],
  releasePointerCapture: [13, 4],
  hasPointerCapture: [14, 5],
  focusNode: [15, -1],
  blurNode: [16],
  scrollTo: [17, 100, 200],
  scrollBy: [18, 30, 40],
  scrollIntoView: [19],
  getScrollState: [20],
  getSelection: [],
  clearSelection: [],
  getTouchSelection: [],
  setTextAndSelection: [21, 6, 'text', 1, 2],
  setTextSelection: [22, 3, 4, true],
  getTextInputState: [23],
  getCaretRect: [24, 5, -1],
  getOffsetAtPoint: [25, 6.5, 7.5],
  getRangeRects: [26, 8, 9],
  resolveEvent: [27, true, 'copy'],
  claimsKeyChord: ['KeyA', 'a', true, false, true, false],
  focusedPath: [],
};

test('a root with camel-cased methods is the host the renderer calls, itself', () => {
  const host = new RecordingHost();
  assert.equal(bindNativeHost(host), host);
});

test('a root with Godot\'s names is called by them, each method with its arguments in order, and its answer is given back', () => {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  /** A host each of whose methods records its call and answers with its own name; its `size` is the recording host's. */
  const camel = new Proxy(new RecordingHost(), {
    get(target, key) {
      const value: unknown = Reflect.get(target, key);
      if (typeof value !== 'function' || typeof key !== 'string') return value;
      return (...args: unknown[]) => {
        calls.push({ name: key, args });
        return `${key} answered`;
      };
    },
  });
  const named = godotNamed(camel);
  assert.equal('takeCommitDeletions' in named, false);
  assert.equal('take_commit_deletions' in named, true);
  const bound = bindNativeHost(named);
  assert.notEqual(bound, named);
  for (const [name, args] of Object.entries(CALLS)) {
    const method: unknown = Reflect.get(bound, name);
    assert.equal(typeof method, 'function', `${name} of the bound host`);
    if (typeof method !== 'function') continue;
    const answer: unknown = Reflect.apply(method, bound, args);
    assert.deepEqual(calls.at(-1), { name, args }, `${name} of the bound host reached the root`);
    assert.equal(answer, `${name} answered`);
  }
  assert.equal(calls.length, Object.keys(CALLS).length);
  assert.deepEqual(Object.keys(bound).sort(), [...Object.keys(CALLS), 'size'].sort(), 'the bound host has the methods of NativeHost, and size');
  assert.deepEqual(bound.size, { x: 1024, y: 768 });
});

function Counter() {
  const [count, setCount] = useState(0);
  return h(Button, { testID: 'counter', onClick: () => setCount(value => value + 1) }, `Count: ${count}`);
}

test('a root renders, takes events and unmounts on a host with Godot\'s names', async () => {
  const host = new RecordingHost();
  const root = createRoot(godotNamed(host), { subscribeToEvents: NO_SUBSCRIPTION });
  root.render(h(Counter));
  await waitFor(() => [...host.nodes.values()].some(entry => entry.text === 'Count: 0'));
  const button = root.findByTestID('counter');
  assert.ok(button);
  host.event(button.id, 'click');
  root.dispatchEvents();
  await waitFor(() => [...host.nodes.values()].some(entry => entry.text === 'Count: 1'));
  root.unmount();
  assert.equal(host.nodes.size, 1, 'the deletions were read: only the layer root is left');
});

test('a proxy of a root that godot.lib.api made is unwrapped, and nothing is read through it', async () => {
  for (const name of ['camel-cased', 'Godot\'s'] as const) {
    const host = new RecordingHost();
    const proxied = proxyOf(name === 'camel-cased' ? host : godotNamed(host));
    const root = createRoot(proxied, { subscribeToEvents: NO_SUBSCRIPTION });
    root.render(h(Counter));
    await waitFor(() => [...host.nodes.values()].some(entry => entry.text === 'Count: 0'));
    const button = root.findByTestID('counter');
    assert.ok(button);
    host.event(button.id, 'click');
    root.dispatchEvents();
    await waitFor(() => [...host.nodes.values()].some(entry => entry.text === 'Count: 1'));
    root.unmount();
    assert.equal(readsThrough(proxied), 0, `a root with ${name} names`);
  }
});

test('the package loads with no godot.lib.api, which is loaded when a root is first handed over', () => {
  // A process of its own, without this suite's tsconfig: nothing in it stands in for GodotJS's module, as nothing does in a project's Node
  // tests. The style compiler has to work there. Handing a root over is what needs the module, and failing for want of it is what shows the
  // process has none.
  const script = `
    const { compileStyle, createRoot } = require('./src/index.ts');
    const compiled = typeof compileStyle('p-4 text-white');
    let handingOver = 'no error';
    try { createRoot({}, { subscribeToEvents: () => () => {} }); } catch (error) { handingOver = String(error.message).split('\\n')[0]; }
    console.log(JSON.stringify({ compiled, handingOver }));
  `;
  const { TSX_TSCONFIG_PATH: _suiteConfig, ...env } = process.env;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', script], { cwd: join(__dirname, '..'), env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { compiled: 'object', handingOver: 'Cannot find module \'godot.lib.api\'' });
});

test('textures, materials and font faces register on a root of either naming, and a refusal names what was refused', () => {
  const calls: string[] = [];
  const images: ImageHost<string, string> = {
    registerTexture: (id, texture) => (calls.push(`texture ${id} ${texture}`), id === '' ? 'a texture id must not be empty' : ''),
    unregisterTexture: () => true,
    registerMaterial: (id, material) => (calls.push(`material ${id} ${material}`), id === '' ? 'a material id must not be empty' : ''),
    unregisterMaterial: () => true,
  };
  const fonts: FontFaceHost<string> = {
    registerFontFace: (family, weightMin, weightMax, italic, font) => (calls.push(`face ${family} ${weightMin} ${weightMax} ${italic} ${font}`), family === '' ? 'a family must be named' : ''),
  };
  for (const [imageHost, fontHost] of [[images, fonts], [godotNamed(images), godotNamed(fonts)], [proxyOf(godotNamed(images)), proxyOf(godotNamed(fonts))]] as const) {
    calls.length = 0;
    registerTexture(imageHost, 'oak', 'Texture2D');
    registerMaterial(imageHost, 'paper', 'ShaderMaterial');
    registerFontFace(fontHost, { family: 'sans', weight: [100, 900], style: 'italic', font: 'FontFile' });
    registerFontFace(fontHost, { family: 'mono', weight: 400, font: 'FontFile' });
    assert.deepEqual(calls, ['texture oak Texture2D', 'material paper ShaderMaterial', 'face sans 100 900 true FontFile', 'face mono 400 400 false FontFile']);
    assert.throws(() => registerTexture(imageHost, '', 'Texture2D'), /Cannot register the texture : a texture id must not be empty/u);
    assert.throws(() => registerMaterial(imageHost, '', 'ShaderMaterial'), /Cannot register the material : a material id must not be empty/u);
    assert.throws(() => registerFontFace(fontHost, { family: '', weight: 400, font: 'FontFile' }), /Cannot register the {2}face: a family must be named/u);
  }
});

test('activity and the native profile are read from a root of either naming', () => {
  const asked: string[] = [];
  // Only what the two readers ask of a root matters here, so each answer is JSON they refuse.
  const host = new Proxy<NativeDiagnosticsHost>(new class extends RecordingHost implements NativeDiagnosticsHost {
    setProfiling(): void {}
    takeProfile(): string { return (asked.push('takeProfile'), '{"dropped":"none"}'); }
    getActivity(): string { return (asked.push('getActivity'), '{"animating":"no"}'); }
  }(), {});
  for (const root of [host, godotNamed(host)]) {
    asked.length = 0;
    assert.throws(() => readActivity(root), /Native activity.animating must be boolean/u);
    assert.throws(() => takeNativeProfile(root), /profile dropped/u);
    assert.deepEqual(asked, ['getActivity', 'takeProfile']);
  }
});
