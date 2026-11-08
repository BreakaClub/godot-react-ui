import { useLayoutEffect, useRef, useState } from 'react';
import { Button, RadioGroup, Switch, Text, View } from 'godot-react-ui';
import { BenchmarkApp, type BenchmarkProps } from './benchmark';
import { LabCase, LabIntro, LabLimit, Readout } from './lab-parts';

/**
 * The benchmark fixture (`benchmark.tsx`, which the performance baselines drive) with controls for its size and what an update
 * does, in place of the baselines' props. It opens small: the cost of mounting grows with the number of cells, and a bigger
 * grid is one press away.
 *
 * It also times what it does. A press (or a choice of size) stamps the clock; a layout effect in this component runs after React's commit,
 * and the commit includes the renderer's one synchronous call to native (`replaceContainerChildren` in `src/renderer.ts`, which in the Fabric
 * renderer lays out, updates geometry and records the changed canvas items, `docs/INTERACTION_PROGRESS.md` Phase F4), so the difference is the
 * time from the press until the change has been committed. It stops before the GPU draws the frame, and it is not the fixture's own
 * measurement: the baselines read the renderer's profile and counters from the verifier.
 */

const CELL_COUNTS = [100, 250, 500, 1000, 2000] as const;
const DEFAULT_CELL_COUNT = 100;
type UpdateMode = Extract<BenchmarkProps['mode'], 'paint' | 'layout' | 'text'> | 'one';
const UPDATE_MODES: readonly { readonly value: UpdateMode; readonly label: string; readonly note: string }[] = [
  { value: 'paint', label: 'Repaint', note: 'Every cell changes colour. Nothing is laid out again.' },
  { value: 'layout', label: 'Relayout', note: 'Every cell changes height, so the grid is laid out again.' },
  { value: 'text', label: 'Reflow text', note: 'Every cell changes its shaped text, which is measured and wrapped again.' },
  { value: 'one', label: 'One cell', note: 'Only the first cell, top left, changes colour. The cells are in rows that React skips when nothing in them changed.' },
];
const DEFAULT_MODE: UpdateMode = 'paint';
/** The fixture's grid has ten columns, so rows of ten look exactly like the flat grid. */
const CELLS_PER_ROW = 10;
const ONE_CELL_INDEX = 0;
const READING_FRACTION_DIGITS = 1;

function updateMode(value: string): UpdateMode {
  const found = UPDATE_MODES.find(candidate => candidate.value === value);
  if (found === undefined) throw new Error(`There is no benchmark update ${value}`);
  return found.value;
}

/** What the fixture renders for the page's choices. */
function fixtureProps(mode: UpdateMode, count: number, text: boolean, phase: number): BenchmarkProps {
  if (mode === 'one') return { count, text: false, phase, mode: 'paint', only: ONE_CELL_INDEX, rowSize: CELLS_PER_ROW };
  return { count, text, phase, mode };
}

/** Milliseconds from a clock that does not go backwards where there is one, as the library's own profiler reads it (`src/profile.ts`). */
function nowMs(): number {
  return typeof performance === 'object' ? performance.now() : Date.now();
}

/** A change being timed: the clock when it was asked for, and what it was, for the line that reports it. */
interface Timing {
  readonly kind: 'mount' | 'update';
  readonly startedAt: number;
  readonly what: string;
}

function describeGrid(count: number, text: boolean): string {
  return `${count} cells${text ? ' with text' : ''}`;
}

/** A text update needs text to update, and one cell is plain boxes in rows. */
function hasText(mode: UpdateMode, shapedText: boolean): boolean {
  return mode === 'text' || (mode !== 'one' && shapedText);
}

/** What makes two grids different trees: a change of it mounts a new grid (`key`), and any other change updates the one there is. */
function gridKey(count: number, text: boolean, mode: UpdateMode): string {
  return `${count}:${text}:${mode === 'one'}`;
}

export function BenchmarkExplorer() {
  const [count, setCount] = useState<number>(DEFAULT_CELL_COUNT);
  const [mode, setMode] = useState<UpdateMode>(DEFAULT_MODE);
  const [shapedText, setShapedText] = useState(false);
  const [phase, setPhase] = useState(0);
  const [mounted, setMounted] = useState<string | undefined>(undefined);
  const [updated, setUpdated] = useState<string | undefined>(undefined);
  const text = hasText(mode, shapedText);
  const current = UPDATE_MODES.find(candidate => candidate.value === mode);
  const note = current?.note ?? '';

  // The grid's first mount is timed from this component's first render.
  const [openedAt] = useState(nowMs);
  const timing = useRef<Timing | undefined>({ kind: 'mount', startedAt: openedAt, what: describeGrid(DEFAULT_CELL_COUNT, false) });
  useLayoutEffect(() => {
    const started = timing.current;
    if (started === undefined) return;
    timing.current = undefined;
    const reading = `${started.what}, ${(nowMs() - started.startedAt).toFixed(READING_FRACTION_DIGITS)} ms`;
    if (started.kind === 'mount') setMounted(reading);
    else setUpdated(reading);
  });

  /** Change what the page has chosen. A new kind of grid is mounted (and timed); the cells go back to how they start. */
  const choose = (next: { count?: number; mode?: UpdateMode; shapedText?: boolean }) => {
    const nextCount = next.count ?? count;
    const nextMode = next.mode ?? mode;
    const nextText = hasText(nextMode, next.shapedText ?? shapedText);
    if (gridKey(nextCount, nextText, nextMode) !== gridKey(count, text, mode)) {
      timing.current = { kind: 'mount', startedAt: nowMs(), what: describeGrid(nextCount, nextText) };
    }
    setCount(nextCount);
    setMode(nextMode);
    if (next.shapedText !== undefined) setShapedText(next.shapedText);
    setPhase(0);
    setUpdated(undefined);
  };

  return (
    <View testID="benchmark-explorer" className="w-full gap-4 p-4">
      <LabIntro
        title="What a change costs"
        paragraphs={[
          'A grid of identical boxes, mounted through React into native nodes. Choose how many, press the button to change them, and read how long it took on this device. It is the fixture the project\'s performance baselines drive.',
          'The library is built like React Native\'s Fabric: a change is found in JavaScript by comparing instances, sent to native as one batch, and native re-records only the drawing of what changed. So changing one cell should cost little more in a grid of 2,000 than in a grid of 100, while changing every cell costs more the more cells there are.',
        ]}
      />
      <LabCase
        title="The grid"
        caption="Cells is how many boxes the grid mounts; each is a React element and a native node. Shaped text puts a line of text in every box, which native has to shape and wrap. Changing either mounts a new grid, and Grid mounted shows how long that took."
      >
        <View className="gap-2">
          <Text className="text-xs text-slate-500">Cells</Text>
          <RadioGroup.Root
            testID="benchmark-count" aria-label="Cells" orientation="horizontal" className="flex-row flex-wrap gap-x-4 gap-y-2"
            value={String(count)}
            onValueChange={value => choose({ count: Number(value) })}
          >
            {CELL_COUNTS.map(option => (
              <RadioGroup.Item key={option} testID={`benchmark-count-${option}`} value={String(option)} className="py-1 text-sm text-slate-700">
                {String(option)}
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
        </View>
        <View className="gap-2">
          <Text className="text-xs text-slate-500">Content</Text>
          <Switch
            testID="benchmark-text" checked={text} disabled={mode === 'text' || mode === 'one'}
            onCheckedChange={checked => choose({ shapedText: checked })}
            className="py-1 text-sm text-slate-700"
          >
            Shaped text
          </Switch>
        </View>
        <Readout label="Grid mounted:" value={mounted ?? 'not yet'} testID="benchmark-mounted" />
      </LabCase>
      <LabCase
        title="The change"
        caption="Choose what an update does, then press the button: it changes the cells and reads the time it took."
        expected="the cells flip between two colours (or two heights, or two texts), and Last update shows a time. Press it a few times: one reading is noisy."
      >
        <View className="gap-2">
          <Text className="text-xs text-slate-500">An update</Text>
          <RadioGroup.Root
            testID="benchmark-mode" aria-label="An update" orientation="horizontal" className="flex-row flex-wrap gap-x-4 gap-y-2"
            value={mode} onValueChange={value => choose({ mode: updateMode(value) })}
          >
            {UPDATE_MODES.map(option => (
              <RadioGroup.Item key={option.value} testID={`benchmark-mode-${option.value}`} value={option.value} className="py-1 text-sm text-slate-700">
                {option.label}
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
          <Text testID="benchmark-note" className="text-sm text-slate-500">{note}</Text>
        </View>
        <Button
          testID="benchmark-update"
          className="self-start rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 active:bg-indigo-800 focus:border-indigo-500"
          onClick={() => {
            timing.current = { kind: 'update', startedAt: nowMs(), what: `${current?.label ?? mode} of ${describeGrid(count, text)}` };
            setPhase(value => value + 1);
          }}
        >
          {mode === 'one' ? 'Update one cell' : 'Update every cell'}
        </Button>
        <Readout label="Last update:" value={updated ?? 'press the button'} testID="benchmark-updated" />
        <Readout label="Updates so far:" value={String(phase)} testID="benchmark-updates" />
      </LabCase>
      <LabCase
        title="What the figures are"
        caption="Grid mounted runs from your choice until React has finished committing the new grid (the old one is removed in the same commit), and Last update from your press until React has finished committing the change. Both include the native commit React makes (styles, layout and the drawing records of what changed) and stop before the GPU draws the frame. The line above the grid is the fixture's own status."
      >
        <LabLimit>the times are wall-clock time on this device and in this build, one reading at a time, so they are not the project's baselines.</LabLimit>
        <Text className="text-sm text-slate-600">
          For comparison, the project's own run on 6 November 2026 (a Mac, Chrome, the Web debug template, React's development build; docs/INTERACTION_PROGRESS.md, Phase F4) updated every one of 2,000 cells in 51.7 ms (median). It changed one cell, in rows React skips, in 1.8 ms, and native's commit for it took 0.15 ms.
        </Text>
      </LabCase>
      <BenchmarkApp key={gridKey(count, text, mode)} {...fixtureProps(mode, count, text, phase)} />
    </View>
  );
}
