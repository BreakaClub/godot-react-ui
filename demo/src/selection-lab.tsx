import { useLayoutEffect, useState } from 'react';
import { Button, ScrollView, Text, View, useTextSelection } from 'godot-react-ui';

/** How many rows the scrolling list has: more than fit, so some are selectable but out of view. */
const LIST_ROWS = 14;

/**
 * What the verifier may ask of the lab from outside an event: change a text that is, or is not, in the selection,
 * and remove a paragraph that is. They are what an app does on a timer or when data arrives, so the commit that
 * follows is a real React commit, not a press (a press would clear the selection by itself).
 */
export interface SelectionLabControls {
  /** Change the text of the live line, which sits below the two paragraphs. */
  changeLiveText(): void;
  /** Remove the tail paragraph, the last element of the article. */
  removeTail(): void;
  /** Insert a new selectable line between the second paragraph and the live line. */
  insertLine(): void;
}

let controls: SelectionLabControls | undefined;

export function selectionLabControls(): SelectionLabControls {
  if (!controls) throw new Error('The selection lab is not mounted');
  return controls;
}

function indexes(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

/** `selection: "…"` and where the ends are, from `useTextSelection()`. */
function Readout() {
  const selection = useTextSelection();
  const where = (point: { node: { testID: string | undefined }; offset: number }) => `${point.node.testID ?? '?'}:${point.offset}`;
  return (
    <View className="gap-1">
      <Text testID="sel-readout" className="text-sm text-slate-900">
        {selection === undefined ? 'selected: nothing' : `selected: ${JSON.stringify(selection.text)}`}
      </Text>
      <Text testID="sel-ends" className="text-xs text-slate-500">
        {selection === undefined ? 'no ends' : `anchor ${where(selection.anchor)}, focus ${where(selection.focus)}${selection.isCollapsed ? ', collapsed' : ''}`}
      </Text>
    </View>
  );
}

/** Phase I6: text selection. `select-text` opts text in; `select-none` opts a part of it out; a Button is never selectable. */
export function SelectionLab() {
  const [count, setCount] = useState(0);
  const [showTail, setShowTail] = useState(true);
  const [showInserted, setShowInserted] = useState(false);
  useLayoutEffect(() => {
    controls = {
      changeLiveText: () => setCount(current => current + 1),
      removeTail: () => setShowTail(false),
      insertLine: () => setShowInserted(true),
    };
    return () => { controls = undefined; };
  }, []);
  return (
    <View testID="selection-lab" className="w-full min-h-full bg-slate-50 p-4 gap-3">
      <View className="gap-1">
        <Text testID="selection-title" className="text-2xl text-slate-900">Selecting text</Text>
        <Text className="text-sm text-slate-500">Click, double click, triple click, drag, Shift+click, Cmd/Ctrl+C and Cmd/Ctrl+A on the white card.</Text>
      </View>
      <View testID="selection-article" className="select-text w-[520px] gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <Text testID="sel-p1" className="text-sm text-slate-900">The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</Text>
        <Text testID="sel-none" className="select-none text-sm text-slate-400">This sentence is select-none: a selection runs past it and skips it.</Text>
        <Text testID="sel-p2" className="text-sm text-slate-900">Sphinx of black quartz, judge my vow. A backpack 🎒 is two UTF-16 units. How vexingly quick daft zebras jump!</Text>
        {showInserted ? <Text testID="sel-inserted" className="text-sm text-slate-900">An inserted line.</Text> : null}
        <Text testID="sel-live" className="text-sm text-slate-900">{`Live line ${count}`}</Text>
        {showTail ? <Text testID="sel-tail" className="text-sm text-slate-900">The tail paragraph can be removed.</Text> : null}
        <Button testID="sel-button" className="self-start rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500">Buttons are never selectable</Button>
      </View>
      <Text testID="sel-plain" className="w-[520px] text-sm text-slate-600">Outside the card, with no select-text: not selectable.</Text>
      <View className="w-[520px] flex-row items-start gap-3">
        <View
          testID="sel-captor"
          className="select-text w-[254px] rounded-lg border border-indigo-200 bg-white p-1"
          onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)}
        >
          <Text testID="sel-captured" className="text-sm text-slate-900">Its element captures the pointer: no selection.</Text>
        </View>
        <View testID="sel-vetoer" className="select-text w-[254px] rounded-lg border border-rose-200 bg-white p-1" onPointerDown={event => event.preventDefault()}>
          <Text testID="sel-prevented" className="text-sm text-slate-900">Its element prevents pointerdown: no selection.</Text>
        </View>
      </View>
      <View className="flex-row items-start gap-3">
        <Text testID="sel-short" className="select-text self-start rounded bg-white px-1 text-sm text-slate-900">Highlight</Text>
        <Text testID="sel-rose" className="select-text selection-[#f43f5e80] self-start rounded bg-white px-1 text-sm text-slate-900">Rose highlight</Text>
      </View>
      <ScrollView testID="sel-scroll" className="select-text h-24 w-[520px] rounded-xl border border-slate-200 bg-white" contentClassName="gap-1 p-2">
        {indexes(LIST_ROWS).map(index => (
          <Text key={index} testID={`sel-row-${index}`} className="self-start text-sm text-slate-900">{`Scrolling row ${index}`}</Text>
        ))}
      </ScrollView>
      <Readout />
    </View>
  );
}
