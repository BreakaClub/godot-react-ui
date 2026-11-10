import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as library from '../src';
import { Text, View, createRoot } from '../src';
import { LiveSession } from '../demo/src/live-compile-session';
import { installRefreshHook, performRefresh, refreshHooks } from '../demo/src/live-compile-refresh';
import type { Project } from '../demo/src/live-compile-project';
import { RequestCancelled } from 'godot-tsc/host';
import { cliHost, NEEDS_CLI } from './live-compile-cli-host';
import { NO_SUBSCRIPTION, RecordingHost } from './recording-host';

// A live session whose edits are overtaken (demo/src/live-compile-session.ts), against the real transpiler (the godot-tsc package's `godot-tsc-cli`
// process, tests/live-compile-cli-host.ts) answering when the test lets it, as the extension answers when the service thread is free. What is held
// is the answer to a compile: the page, meanwhile, is the last good version, and an answer that comes after the work was given up is not applied.

const LAB_PATH = '/project/lab/small-lab.tsx';
const LABEL_PATH = '/project/lab/label.ts';
const EXTRA_PATH = '/project/lab/extra.ts';

const LAB_SOURCE = `import { useState } from 'react';
import { Button, Text, View } from 'godot-react-ui';
import { label } from './label';

export function SmallLab() {
  const [count, setCount] = useState(0);
  return (
    <View testID="small">
      <Text testID="title">{label}</Text>
      <Button testID="count" onClick={() => setCount(count + 1)}><Text>{\`n \${count}\`}</Text></Button>
    </View>
  );
}
`;
const LABEL_SOURCE = `export const label = 'one';\n`;
const EXTRA_SOURCE = `export const extra = 'extra';\n`;

const project: Project = {
  version: 1,
  libDir: '/libs',
  files: [{ path: LAB_PATH, text: LAB_SOURCE }, { path: LABEL_PATH, text: LABEL_SOURCE }, { path: EXTRA_PATH, text: EXTRA_SOURCE }],
  labs: { small: { config: '/project/tsconfig.small.json', sources: [LAB_PATH, LABEL_PATH] } },
};

interface Gate {
  readonly promise: Promise<void>;
  open(): void;
}

function gate(): Gate {
  let open: () => void = () => {};
  const promise = new Promise<void>(done => { open = done; });
  return { promise, open };
}

/** The compiles the service was asked for, and the gate that holds each answer (none: answered at once). */
interface Service {
  readonly requested: { readonly path: string; readonly text: string }[];
  readonly gates: Map<string, Gate>;
  /** The gate that holds the answers of checks, if any. */
  checks: Gate | undefined;
}

function PlaceholderLab() {
  return React.createElement(Text, { testID: 'placeholder' }, 'the bundled lab');
}

installRefreshHook();

function open(options: { embedded?: boolean } = {}) {
  const service: Service = { requested: [], gates: new Map(), checks: undefined };
  const host = cliHost({
    onRequest: (path, text) => { service.requested.push({ path, text }); },
    hold: path => service.gates.get(path)?.promise ?? Promise.resolve(),
    holdChecks: () => service.checks?.promise ?? Promise.resolve(),
  });
  const fake = new RecordingHost();
  const root = createRoot(fake, { subscribeToEvents: NO_SUBSCRIPTION, onError: () => {} });
  const session = new LiveSession({
    host, project, labId: 'small', exportName: 'SmallLab', root, embedded: options.embedded ?? true, placeholder: PlaceholderLab,
    externals: { react: React, 'react/jsx-runtime': jsxRuntime, 'godot-react-ui': library },
    aliases: {}, refresh: refreshHooks, performRefresh, now: () => 0,
  });
  const textOf = (testID: string): string => {
    const tag = fake.findByTestId(testID);
    if (tag <= 0) return '';
    const collect = (id: number): string => (fake.nodes.get(id)?.text ?? '') + (fake.nodes.get(id)?.children ?? []).map(collect).join('');
    return collect(tag);
  };
  const stage = (): void => root.render(React.createElement(View, { testID: 'stage' }, React.createElement(session.Lab)));
  return { service, session, fake, root, textOf, stage };
}

const hold = (service: Service, path: string): Gate => {
  const held = gate();
  service.gates.set(path, held);
  return held;
};

const settle = (): Promise<void> => new Promise(done => setTimeout(done, 5));

test('the stage shows the bundled lab until the lab has been compiled and run, and then the compiled one', { skip: NEEDS_CLI }, async () => {
  const { service, session, textOf, stage } = open();
  const held = hold(service, LAB_PATH);
  stage();
  assert.equal(textOf('placeholder'), 'the bundled lab', 'before the open: the bundled lab');
  const opening = session.open();
  await settle();
  assert.equal(textOf('placeholder'), 'the bundled lab', 'while the compile is outstanding: still the bundled lab, and the frame went on');
  assert.equal(textOf('small'), '');
  held.open();
  await opening;
  assert.equal(textOf('placeholder'), '', 'once the lab has run: not the bundled lab');
  assert.equal(textOf('title'), 'one');
  // The files the lab imports are asked for with it, so no module body waits for the compiler.
  assert.deepEqual(service.requested.map(request => request.path), [LAB_PATH, LABEL_PATH]);
  session.unmount();
});

test('an edit made while the lab is opening waits for it and is then swapped in', { skip: NEEDS_CLI }, async () => {
  const { service, session, textOf, stage } = open();
  const held = hold(service, LAB_PATH);
  stage();
  const opening = session.open();
  const editing = session.update(LABEL_PATH, `export const label = 'two';\n`);
  await settle();
  held.open();
  await opening;
  const report = await editing;
  assert.equal(report.outcome, 'swapped', report.error);
  assert.equal(textOf('title'), 'two');
  session.unmount();
});

test('a newer edit of a file overtakes the older: the older answers superseded, its compile is taken back, and its text is never shown', { skip: NEEDS_CLI }, async () => {
  const { service, session, textOf, stage } = open();
  stage();
  await session.open();
  service.requested.length = 0;
  const held = hold(service, LABEL_PATH);
  const shown: string[] = [];
  const older = session.update(LABEL_PATH, `export const label = 'older';\n`);
  const newer = session.update(LABEL_PATH, `export const label = 'newer';\n`);
  await settle();
  shown.push(textOf('title'));
  assert.equal(textOf('title'), 'one', 'the page is the last good version while the compiles wait');
  held.open();
  const [olderReport, newerReport] = await Promise.all([older, newer]);
  shown.push(textOf('title'));
  assert.equal(olderReport.outcome, 'superseded');
  assert.deepEqual(olderReport.evaluated, [], 'nothing of it was evaluated');
  assert.equal(newerReport.outcome, 'swapped', newerReport.error);
  assert.equal(textOf('title'), 'newer');
  assert.ok(!shown.includes('older'), `the older text was never on the page: ${shown.join(', ')}`);
  session.unmount();
});

test('the older answer arriving first is still not applied: it is the newest edit of the file that counts', { skip: NEEDS_CLI }, async () => {
  const { service, session, textOf, stage } = open();
  stage();
  await session.open();
  const held = hold(service, LABEL_PATH);
  // The older compile is answered the instant the newer edit is made: the answer is in hand, but the work was given up.
  const older = session.update(LABEL_PATH, `export const label = 'older';\n`);
  held.open();
  const newer = session.update(LABEL_PATH, `export const label = 'newer';\n`);
  const [olderReport, newerReport] = await Promise.all([older, newer]);
  assert.equal(olderReport.outcome, 'superseded');
  assert.equal(newerReport.outcome, 'swapped', newerReport.error);
  assert.equal(textOf('title'), 'newer');
  session.unmount();
});

test('edits of different files do not overtake each other', { skip: NEEDS_CLI }, async () => {
  const { service, session, textOf, stage } = open();
  stage();
  await session.open();
  const lab = hold(service, LAB_PATH);
  const label = hold(service, LABEL_PATH);
  const labEdit = session.update(LAB_PATH, LAB_SOURCE.replace('n ${count}', 'count ${count}'));
  const labelEdit = session.update(LABEL_PATH, `export const label = 'two';\n`);
  await settle();
  label.open();
  lab.open();
  const [labReport, labelReport] = await Promise.all([labEdit, labelEdit]);
  assert.equal(labReport.outcome, 'swapped', labReport.error);
  assert.equal(labelReport.outcome, 'swapped', labelReport.error);
  assert.equal(textOf('title'), 'two');
  assert.equal(textOf('count'), 'count 0');
  session.unmount();
});

test('a file the edit newly imports is compiled with it, before the edit runs', { skip: NEEDS_CLI }, async () => {
  const { service, session, textOf, stage } = open();
  stage();
  await session.open();
  service.requested.length = 0;
  const report = await session.update(LAB_PATH, LAB_SOURCE.replace("import { label } from './label';", "import { label } from './label';\nimport { extra } from './extra';").replace('{label}', '{label + extra}'));
  assert.equal(report.outcome, 'swapped', report.error);
  assert.deepEqual(service.requested.map(request => request.path), [LAB_PATH, EXTRA_PATH]);
  assert.equal(textOf('title'), 'oneextra');
  session.unmount();
});

test('ending the session takes back its edits and its open: the edit answers superseded, the open fails as cancelled, and nothing is applied', { skip: NEEDS_CLI }, async () => {
  const { service, session, textOf, stage } = open();
  const held = hold(service, LAB_PATH);
  stage();
  const opening = session.open();
  const opened = opening.then(() => 'opened', (error: unknown) => (error instanceof RequestCancelled ? 'cancelled' : String(error)));
  await settle();
  const editing = session.update(LABEL_PATH, `export const label = 'two';\n`);
  session.unmount();
  assert.equal(await opened, 'cancelled');
  held.open();
  assert.equal((await editing).outcome, 'superseded');
  assert.equal(textOf('small'), '', 'the lab never reached the page');
});

test('a session that was ended cannot be opened', { skip: NEEDS_CLI }, async () => {
  const { session } = open();
  session.unmount();
  await assert.rejects(session.open(), RequestCancelled);
});

test('putting the last good page back after a render that threw asks the compiler for nothing', { skip: NEEDS_CLI }, async () => {
  const { service, session, textOf, stage } = open();
  stage();
  await session.open();
  service.requested.length = 0;
  const originalError = console.error;
  console.error = () => {};
  let report;
  try {
    report = await session.update(LAB_PATH, LAB_SOURCE.replace('  return (', "  if (count >= 0) throw new Error('render throws');\n  return ("));
  } finally {
    console.error = originalError;
  }
  assert.equal(report.outcome, 'render-failed');
  assert.ok(report.rolledBack);
  assert.deepEqual(service.requested.map(request => request.path), [LAB_PATH], 'only the edit was compiled: the last good version is evaluated from the code it ran from');
  assert.equal(textOf('title'), 'one', 'and it is on the page');
  session.unmount();
});

test('ending the session takes back its checks, hovers and hints: the service spends nothing on a lab nobody is looking at', { skip: NEEDS_CLI }, async () => {
  const { service, session, stage } = open();
  stage();
  await session.open();
  service.checks = gate();
  const check = session.check();
  const outcome = check.then(() => 'answered', (error: unknown) => (error instanceof RequestCancelled ? 'cancelled' : String(error)));
  await settle();
  session.unmount();
  assert.equal(await outcome, 'cancelled');
});
