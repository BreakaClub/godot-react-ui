// The editor body built four ways from what the library has today, for the measurements in bench.ts. Each is a complete
// React component; the bench renders one, reads the profile, edits it, and renders the next.
import { memo, useState, type ReactElement } from 'react';
import { Text, TextInput, View, type TextInputHandle } from '../../../../src';
import { ScrollView } from '../../../../src/kit';
import { useGodotVirtualizer } from '../../frameworks/virtual/godot-virtual';
import type { Run } from './runs';

export const LINE_HEIGHT = 20;
export const VIEWPORT_WIDTH = 900;
export const VIEWPORT_HEIGHT = 760;
const OVERSCAN = 5;

/** What a scenario hands the bench so it can change the document the way typing would, from outside React. */
export interface Controls {
  /** Replace the runs (or text) of one line, as the editor does for the line a keystroke touched. */
  setLine?: (index: number, runs: readonly Run[]) => void;
  setText?: (index: number, text: string) => void;
  input?: TextInputHandle | null;
  scroll?: { scrollTo(position: { top: number }): void } | null;
  renders: { lines: number };
}
export const controls: Controls = { renders: { lines: 0 } };

const FONT = 'text-sm shrink-0';

/** One text line as one `Text`. */
const PlainLine = memo(function PlainLine({ text }: { text: string }): ReactElement {
  controls.renders.lines += 1;
  return <Text className={FONT} style={{ height: LINE_HEIGHT }}>{text}</Text>;
});

/** One coloured line as a row of `Text` runs: the only way to colour parts of a line today. */
const RichLine = memo(function RichLine({ runs }: { runs: readonly Run[] }): ReactElement {
  controls.renders.lines += 1;
  return (
    <View className="flex-row shrink-0" style={{ height: LINE_HEIGHT }}>
      {runs.map((run, index) => <Text key={index} className={FONT} style={{ color: run.color }}>{run.text}</Text>)}
    </View>
  );
});

export function PlainLines({ lines }: { lines: readonly string[] }): ReactElement {
  const [current, setCurrent] = useState(lines);
  controls.setText = (index, text) => { setCurrent((all) => all.map((line, at) => (at === index ? text : line))); };
  return (
    <ScrollView testID="scroller" focusable={false} className={`w-[${VIEWPORT_WIDTH}px] h-[${VIEWPORT_HEIGHT}px]`}>
      {current.map((line, index) => <PlainLine key={index} text={line} />)}
    </ScrollView>
  );
}

export function RichLines({ rows }: { rows: readonly (readonly Run[])[] }): ReactElement {
  const [current, setCurrent] = useState(rows);
  controls.setLine = (index, runs) => { setCurrent((all) => all.map((row, at) => (at === index ? runs : row))); };
  return (
    <ScrollView testID="scroller" focusable={false} className={`w-[${VIEWPORT_WIDTH}px] h-[${VIEWPORT_HEIGHT}px]`}>
      {current.map((runs, index) => <RichLine key={index} runs={runs} />)}
    </ScrollView>
  );
}

/** The same rows windowed by @tanstack/virtual-core through the adapter in frameworks/virtual/godot-virtual.ts. */
export function VirtualRichLines({ rows }: { rows: readonly (readonly Run[])[] }): ReactElement {
  const [current, setCurrent] = useState(rows);
  controls.setLine = (index, runs) => { setCurrent((all) => all.map((row, at) => (at === index ? runs : row))); };
  const virtual = useGodotVirtualizer({ count: current.length, estimateSize: () => LINE_HEIGHT, overscan: OVERSCAN });
  controls.scroll = virtual.source;
  const first = virtual.items[0];
  const last = virtual.items[virtual.items.length - 1];
  const before = first === undefined ? 0 : first.start;
  const after = last === undefined ? virtual.totalSize : virtual.totalSize - last.end;
  return (
    <ScrollView
      ref={virtual.containerRef} onScroll={virtual.onScroll} testID="scroller" focusable={false}
      className={`w-[${VIEWPORT_WIDTH}px] h-[${VIEWPORT_HEIGHT}px]`}
    >
      <View key="before" className="shrink-0" style={{ height: before }} />
      {virtual.items.map((item) => <RichLine key={item.key} runs={current[item.index] ?? []} />)}
      <View key="after" className="shrink-0" style={{ height: after }} />
    </ScrollView>
  );
}

/** The whole document as one `Text`: what native shaping costs for 47,000 characters, and no colour. */
export function WholeText({ text }: { text: string }): ReactElement {
  return (
    <ScrollView testID="scroller" focusable={false} className={`w-[${VIEWPORT_WIDTH}px] h-[${VIEWPORT_HEIGHT}px]`}>
      <Text className={FONT}>{text}</Text>
    </ScrollView>
  );
}

/** The whole document in one native multi-line `TextInput`: native owns the text, there is one style, no runs. */
export function WholeInput({ text, onValue }: { text: string; onValue: (length: number) => void }): ReactElement {
  return (
    <TextInput
      ref={(handle) => { controls.input = handle; }} testID="input" multiline defaultValue={text}
      className={`w-[${VIEWPORT_WIDTH}px] h-[${VIEWPORT_HEIGHT}px] text-sm`}
      onChange={(event) => { onValue(event.value.length); }}
    />
  );
}
