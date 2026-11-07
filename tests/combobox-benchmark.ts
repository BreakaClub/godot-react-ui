import { createElement as h } from 'react';
import { Combobox, Select } from '../src';
import { ComboboxHost } from './combobox-host';
import { createTestRoot } from './recording-host';

/**
 * What typing costs with a long list, measured in JavaScript against the recording host (`tsx tests/combobox-benchmark.ts
 * [count]`). Not a test: it prints. For each keystroke it reports the time `dispatchEvents` took (the keystroke through React
 * to the commit) and what the commit sent native (created and updated nodes, child lists, and the payload's size in bytes).
 */

const COUNT = Number(process.argv[2] ?? 1000);
/** The keystrokes: the first narrows a list of everything to roughly a third, the later ones to a few. */
const KEYS = ['e', 'r', 'r', 'y'] as const;
const REPEATS = 5;

interface Sample {
  readonly ms: number;
  readonly created: number;
  readonly updated: number;
  /** Child lists sent: a removed node is only a child list that no longer names it. */
  readonly lists: number;
  readonly bytes: number;
}

function labelOf(index: number): string {
  // A spread of letters, so a one-letter query keeps a share of them and a longer one few.
  const words = ['cherry', 'berry', 'apple', 'melon', 'peach', 'grape', 'lemon', 'mango', 'olive', 'plum'];
  return `${words[index % words.length] ?? 'fruit'} ${index}`;
}

function run(): Sample[][] {
  const runs: Sample[][] = [];
  for (let repeat = 0; repeat < REPEATS; repeat += 1) {
    const host = new ComboboxHost();
    const { root } = createTestRoot(host);
    root.render(h(Combobox.Root, {},
      h(Combobox.Control, { testID: 'control' }, h(Combobox.Input, { testID: 'input' })),
      h(Combobox.Content, { testID: 'list' },
        ...Array.from({ length: COUNT }, (_, index) => h(Combobox.Item, { key: index, value: `v${index}` },
          h(Combobox.ItemText, {}, labelOf(index)), h(Combobox.ItemIndicator, {}))),
        h(Combobox.Empty, {}, 'No matches'))));
    host.rectsByTestID.set('control', { x: 10, y: 10, width: 300, height: 30 });
    host.rectsByTestID.set('list', { x: 0, y: 0, width: 300, height: 400 });
    const input = root.findByTestID('input')?.id;
    if (input === undefined) throw new Error('no input');
    host.focusNode(input, 1);
    root.dispatchEvents();
    const samples: Sample[] = [];
    // The first keystroke also opens the list and mounts every option in it.
    for (const key of KEYS) {
      const before = host.commits.length;
      const started = performance.now();
      host.type(root, key, input);
      const ms = performance.now() - started;
      let created = 0;
      let updated = 0;
      let lists = 0;
      let bytes = 0;
      for (const commit of host.commits.slice(before)) {
        created += commit.payload.created.length;
        updated += commit.payload.updated.length;
        lists += commit.payload.children.length;
        bytes += JSON.stringify(commit.payload).length;
      }
      samples.push({ ms, created, updated, lists, bytes });
    }
    runs.push(samples);
  }
  return runs;
}

/** The time to render a closed combobox with every option in it, to open it with the arrow key, and the same for a `Select`'s list. */
function mountAndOpen(): void {
  const rows: string[] = [];
  for (let repeat = 0; repeat < REPEATS; repeat += 1) {
    const host = new ComboboxHost();
    const { root } = createTestRoot(host);
    const options = Array.from({ length: COUNT }, (_, index) => h(Combobox.Item, { key: index, value: `v${index}` },
      h(Combobox.ItemText, {}, labelOf(index)), h(Combobox.ItemIndicator, {})));
    const mountStarted = performance.now();
    root.render(h(Combobox.Root, {},
      h(Combobox.Control, { testID: 'control' }, h(Combobox.Input, { testID: 'input' })),
      h(Combobox.Content, { testID: 'list' }, ...options)));
    const mountMs = performance.now() - mountStarted;
    host.rectsByTestID.set('control', { x: 10, y: 10, width: 300, height: 30 });
    host.rectsByTestID.set('list', { x: 0, y: 0, width: 300, height: 400 });
    const input = root.findByTestID('input')?.id;
    if (input === undefined) throw new Error('no input');
    host.focusNode(input, 1);
    root.dispatchEvents();
    const before = host.commits.length;
    const openStarted = performance.now();
    host.pressKey(root, 'ArrowDown');
    const openMs = performance.now() - openStarted;
    const created = host.commits.slice(before).reduce((total, commit) => total + commit.payload.created.length, 0);

    const selectHost = new ComboboxHost();
    const { root: selectRoot } = createTestRoot(selectHost);
    selectRoot.render(h(Select.Root, { defaultOpen: false },
      h(Select.Trigger, { testID: 'trigger' }, h(Select.Value, { placeholder: 'x' })),
      h(Select.Content, { testID: 'list' }, ...Array.from({ length: COUNT }, (_, index) => h(Select.Item, { key: index, value: `v${index}` },
        h(Select.ItemText, {}, labelOf(index)), h(Select.ItemIndicator, {}))))));
    selectHost.rectsByTestID.set('trigger', { x: 10, y: 10, width: 300, height: 30 });
    selectHost.rectsByTestID.set('list', { x: 0, y: 0, width: 300, height: 400 });
    const trigger = selectRoot.findByTestID('trigger')?.id;
    if (trigger === undefined) throw new Error('no trigger');
    const selectBefore = selectHost.commits.length;
    const selectStarted = performance.now();
    selectHost.event(trigger, 'click');
    selectRoot.dispatchEvents();
    const selectMs = performance.now() - selectStarted;
    const selectCreated = selectHost.commits.slice(selectBefore).reduce((total, commit) => total + commit.payload.created.length, 0);
    if (repeat > 0) rows.push(`mount ${mountMs.toFixed(1)} ms, open ${openMs.toFixed(1)} ms (${created} nodes created); Select open ${selectMs.toFixed(1)} ms (${selectCreated} nodes created)`);
  }
  console.log(`${COUNT} options, closed then opened (runs after warm-up):`);
  for (const row of rows) console.log(`  ${row}`);
}

mountAndOpen();
const runs = run();
console.log(`${COUNT} options, ${REPEATS} runs (the first is warm-up for the JIT; the median of the rest is reported)`);
KEYS.forEach((key, index) => {
  const column = runs.slice(1).map(samples => samples[index]).filter((sample): sample is Sample => sample !== undefined);
  const sorted = [...column].sort((left, right) => left.ms - right.ms);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (median === undefined) return;
  const query = KEYS.slice(0, index + 1).join('');
  console.log(`  "${query}": ${median.ms.toFixed(1)} ms, commit created ${median.created} updated ${median.updated} child lists ${median.lists}, ${median.bytes} bytes`);
});
