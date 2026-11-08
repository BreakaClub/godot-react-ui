import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as library from '../src';
import { createRoot } from '../src';
import { LiveSession } from '../demo/src/live-compile-session';
import { installRefreshHook, performRefresh, refreshHooks } from '../demo/src/live-compile-refresh';
import type { Project } from '../demo/src/live-compile-protocol';
import { cliHost, NEEDS_CLI } from './live-compile-cli-host';
import { NO_SUBSCRIPTION, RecordingHost } from './recording-host';

// The live session against the real thing short of Godot: Bun's compiler (the `live-compile-cli` process, one spawn for each compile),
// the real React, the real reconciler through the library's own `createRoot`, and the real React Fast Refresh runtime. The page is the
// fake native host's tree. What this does not have is the extension and the pixels (the `live-compile` section of the interaction
// verifier has those). Needs `node scripts/build-live-compile.mjs --cli`.

const root = resolve(__dirname, '..');
const LAB_PATH = '/project/lab/inputs-lab.tsx';
const LAB_SOURCE = readFileSync(resolve(root, 'demo/src/inputs-lab.tsx'), 'utf8');
const PARTS_PATH = '/project/lab/lab-parts.tsx';
const PARTS_SOURCE = readFileSync(resolve(root, 'demo/src/lab-parts.tsx'), 'utf8');

const host = cliHost();

const project: Project = {
  version: 1,
  libDir: '/libs',
  files: [
    { path: LAB_PATH, text: LAB_SOURCE },
    { path: PARTS_PATH, text: PARTS_SOURCE },
  ],
  labs: { inputs: { config: '/project/tsconfig.inputs.json', sources: [LAB_PATH] } },
};

installRefreshHook();
const fakeHost = new RecordingHost();
const uiRoot = createRoot(fakeHost, { subscribeToEvents: NO_SUBSCRIPTION, onError: () => {} });
let time = 0;
const session = new LiveSession({
  host, project, labId: 'inputs', exportName: 'InputsLab', root: uiRoot,
  externals: { react: React, 'react/jsx-runtime': jsxRuntime, 'godot-react-ui': library },
  aliases: {}, refresh: refreshHooks, performRefresh, now: () => { time += 1; return time; },
});

function texts(): string[] {
  return [...fakeHost.nodes.values()].map(entry => entry.text).filter(text => text !== '');
}

/** The page's texts without the counter's number: a rolled-back page starts its state again. */
function textsWithoutCount(): string[] {
  return texts().map(text => text.replace(/^Next \d+$/u, 'Next N'));
}

function counter(): string {
  const tag = fakeHost.findByTestId('inputs-next');
  assert.ok(tag > 0, 'the counter button is on the page');
  const button = fakeHost.nodes.get(tag);
  assert.ok(button);
  return button.children.map(child => fakeHost.nodes.get(child)?.text ?? '').join('');
}

function press(): void {
  fakeHost.event(fakeHost.findByTestId('inputs-next'), 'click');
  uiRoot.dispatchEvents();
}

function backgroundOfPage(): unknown {
  return fakeHost.nodes.get(fakeHost.findByTestId('inputs-lab'))?.props.style;
}

const RECOLOUR = (text: string): string => text.replace('bg-slate-50', 'bg-emerald-100').replace('title="The input kit"', 'title="The input kit, live"');
const HOOK_ORDER = (text: string): string => text.replace(
  '  const [state, setState] = useState<InputsState>(INITIAL_STATE);\n  const [reversed, setReversed] = useState(false);',
  '  const [reversed, setReversed] = useState(false);\n  const [state, setState] = useState<InputsState>(INITIAL_STATE);',
);

test('the lab compiled from its source mounts', { skip: NEEDS_CLI }, async () => {
  await session.open();
  assert.ok(texts().includes('The input kit'), `the title is on the page: ${texts().slice(0, 4).join(' / ')}`);
  assert.equal(counter(), 'Next 0');
});

test('an edit changes the page and a counter keeps its count', { skip: NEEDS_CLI }, async () => {
  press();
  press();
  press();
  assert.equal(counter(), 'Next 3');
  const before = JSON.stringify(backgroundOfPage());
  const report = await session.update(LAB_PATH, RECOLOUR(LAB_SOURCE));
  assert.equal(report.outcome, 'swapped', report.error);
  assert.deepEqual(report.evaluated, [LAB_PATH]);
  assert.ok(texts().includes('The input kit, live') && !texts().includes('The input kit'), `the title reads the new text: ${texts().slice(0, 4).join(' / ')}`);
  assert.notEqual(JSON.stringify(backgroundOfPage()), before, 'the page style changed');
  assert.equal(counter(), 'Next 3', 'the state survived the edit');
  press();
  assert.equal(counter(), 'Next 4', 'and the new page works');
});

test('a changed hook order starts the state again instead of crashing', { skip: NEEDS_CLI }, async () => {
  const report = await session.update(LAB_PATH, HOOK_ORDER(RECOLOUR(LAB_SOURCE)));
  assert.equal(report.outcome, 'swapped', report.error);
  assert.equal(counter(), 'Next 0');
  press();
  assert.equal(counter(), 'Next 1');
});

test('a syntax error and a module that throws change nothing', { skip: NEEDS_CLI }, async () => {
  const good = RECOLOUR(LAB_SOURCE);
  assert.equal((await session.update(LAB_PATH, good)).outcome, 'swapped');
  press();
  press();
  const count = counter();
  const page = [...texts()];
  const syntax = await session.update(LAB_PATH, `${good}\nconst broken = ;\n`);
  assert.equal(syntax.outcome, 'compile-failed');
  assert.equal(syntax.diagnostics[0]?.severity, 'error');
  assert.deepEqual(texts(), page);
  assert.equal(counter(), count);
  const throwing = await session.update(LAB_PATH, good.replace('\nconst label = ', "\nif (INITIAL_STATE.volume >= 0) throw new Error('module throws');\nconst label = "));
  assert.equal(throwing.outcome, 'evaluation-failed');
  assert.equal(throwing.error, 'module throws');
  assert.deepEqual(texts(), page);
  assert.equal(counter(), count);
});

test('a render that throws puts the last good version back', { skip: NEEDS_CLI }, async () => {
  const good = RECOLOUR(LAB_SOURCE);
  assert.equal((await session.update(LAB_PATH, good)).outcome, 'swapped');
  const page = textsWithoutCount();
  const originalError = console.error;
  console.error = () => {};
  let report;
  try {
    report = await session.update(LAB_PATH, good.replace('  const sizes = reversed', "  if (nextClicks >= 0) throw new Error('render throws');\n  const sizes = reversed"));
  } finally {
    console.error = originalError;
  }
  assert.equal(report.outcome, 'render-failed');
  assert.equal(report.error, 'render throws');
  assert.ok(report.rolledBack);
  assert.deepEqual(textsWithoutCount(), page, 'the page is the last good one');
  assert.equal(counter(), 'Next 0', 'with its state started again: React keeps nothing of a tree whose render threw');
  assert.equal(fakeHost.findByTestId('live-compile-error'), -1, 'and no error page stays up');
  press();
  assert.equal(counter(), 'Next 1', 'and it works');
  assert.equal((await session.update(LAB_PATH, good)).outcome, 'swapped', 'the next good edit swaps in');
  assert.equal(counter(), 'Next 1', 'keeping its count');
});
