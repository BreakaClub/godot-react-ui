import { useState } from 'react';
import { Button, RadioGroup, Switch, Text, View } from 'godot-react-ui';
import { BenchmarkApp, type BenchmarkProps } from './benchmark';

/**
 * The benchmark fixture (`benchmark.tsx`, which the performance baselines drive) with controls for its size and what an update
 * does, in place of the baselines' props. It opens small: the cost of mounting grows with the number of cells, and a bigger
 * grid is one press away.
 */

const CELL_COUNTS = [100, 250, 500, 1000, 2000] as const;
const DEFAULT_CELL_COUNT = 100;
type UpdateMode = Extract<BenchmarkProps['mode'], 'paint' | 'layout' | 'text'>;
const UPDATE_MODES: readonly { readonly value: UpdateMode; readonly label: string; readonly note: string }[] = [
  { value: 'paint', label: 'Repaint', note: 'Every cell changes colour. Nothing is laid out again.' },
  { value: 'layout', label: 'Relayout', note: 'Every cell changes height, so the grid is laid out again.' },
  { value: 'text', label: 'Reflow text', note: 'Every cell changes its shaped text, which is measured and wrapped again.' },
];
const DEFAULT_MODE: UpdateMode = 'paint';

function updateMode(value: string): UpdateMode {
  const found = UPDATE_MODES.find(candidate => candidate.value === value);
  if (found === undefined) throw new Error(`There is no benchmark update ${value}`);
  return found.value;
}

export function BenchmarkExplorer() {
  const [count, setCount] = useState<number>(DEFAULT_CELL_COUNT);
  const [mode, setMode] = useState<UpdateMode>(DEFAULT_MODE);
  const [shapedText, setShapedText] = useState(false);
  const [phase, setPhase] = useState(0);
  // A text update needs text to update.
  const text = mode === 'text' || shapedText;
  const note = UPDATE_MODES.find(candidate => candidate.value === mode)?.note ?? '';
  return (
    <View testID="benchmark-explorer" className="w-full gap-4 p-4">
      <View className="gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <View className="flex-row flex-wrap gap-x-8 gap-y-4">
          <View className="gap-2">
            <Text className="text-xs text-slate-500">Cells</Text>
            <RadioGroup.Root
              testID="benchmark-count" aria-label="Cells" orientation="horizontal" className="flex-row flex-wrap gap-4"
              value={String(count)} onValueChange={value => { setCount(Number(value)); setPhase(0); }}
            >
              {CELL_COUNTS.map(option => (
                <RadioGroup.Item key={option} testID={`benchmark-count-${option}`} value={String(option)} className="text-sm text-slate-700">
                  {String(option)}
                </RadioGroup.Item>
              ))}
            </RadioGroup.Root>
          </View>
          <View className="gap-2">
            <Text className="text-xs text-slate-500">An update</Text>
            <RadioGroup.Root
              testID="benchmark-mode" aria-label="An update" orientation="horizontal" className="flex-row flex-wrap gap-4"
              value={mode} onValueChange={value => setMode(updateMode(value))}
            >
              {UPDATE_MODES.map(option => (
                <RadioGroup.Item key={option.value} testID={`benchmark-mode-${option.value}`} value={option.value} className="text-sm text-slate-700">
                  {option.label}
                </RadioGroup.Item>
              ))}
            </RadioGroup.Root>
          </View>
          <View className="gap-2">
            <Text className="text-xs text-slate-500">Content</Text>
            <Switch testID="benchmark-text" checked={text} disabled={mode === 'text'} onCheckedChange={setShapedText} className="text-sm text-slate-700">
              Shaped text
            </Switch>
          </View>
        </View>
        <View className="flex-row flex-wrap items-center gap-4">
          <Button
            testID="benchmark-update"
            className="rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 active:bg-indigo-800 focus:border-indigo-500"
            onClick={() => setPhase(value => value + 1)}
          >
            Update every cell
          </Button>
          <Text testID="benchmark-note" className="min-w-0 flex-1 text-sm text-slate-500">{`${note} Updates so far: ${phase}.`}</Text>
        </View>
      </View>
      <BenchmarkApp count={count} text={text} phase={phase} mode={mode} />
    </View>
  );
}
