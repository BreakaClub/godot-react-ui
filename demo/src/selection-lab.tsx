import { useLayoutEffect, useState } from 'react';
import { Button, ScrollView, Text, View, useTextSelection } from 'godot-react-ui';
import { LabIntro } from './lab-parts';
import { CaseRow, ReadoutHeading } from './text-lab-parts';

/** The counter's text before and after it shrinks. */
const INITIAL_COUNTER = '1000';
const SHRUNK_COUNTER = '999';

/**
 * How many rows the scrolling list has: more than fit, so some are selectable but out of view. Not more: the native verifier drags past everything
 * to the window's last row and expects the end of the last row, so the last row's place in the layout (out of view, under the list's edge) must
 * still be above the bottom of its 1120 x 800 window.
 */
const LIST_ROWS = 10;

/** The width of the white card and of what sits under it: a window narrower than this gives them the window's width. */
const COLUMN = 'w-full max-w-[520px]';

const INTRO = [
  'Text is selectable only where it opts in with select-text (CSS user-select), and a selection can cross paragraphs and skip a select-none part, as in a browser. '
  + 'Use a mouse or trackpad here; on a touch screen, press and hold a word (the Touch text selection lab).',
];
// The grey sentence says itself that it is select-none.
const ARTICLE_CAPTION = 'Click to place a caret, double-click a word, triple-click a paragraph, drag across paragraphs, Shift+click to extend, Cmd/Ctrl+C to copy, Cmd/Ctrl+A to select all.';
const POINTER_CAPTION = 'Drag inside each box. The left one captures the pointer on pointerdown and the right one calls preventDefault on it: neither starts a selection. '
  + 'Capture also clears a selection made elsewhere; preventDefault leaves it alone.';
const HIGHLIGHT_CAPTION = 'Triple-click a short text to select it. The highlight is translucent blue by default; the second text sets its own with selection-[#f43f5e80].';
const LIST_CAPTION = 'Triple-click a row, then scroll the list: the highlight moves with the row and is clipped at the list\'s edge. Select all also takes the rows scrolled out of view.';
const VERIFIER_NOTE = 'The verifier changes the live line, removes the tail paragraph and shortens the 1000 counter from outside a click, '
  + 'to check that a selection over text that changes or goes is cleared.';

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
  /** Make the counter's text one character shorter: "1000" becomes "999". */
  shrinkCounter(): void;
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
function SelectionReadout() {
  const selection = useTextSelection();
  const where = (point: { node: { testID: string | undefined }; offset: number }) => `${point.node.testID ?? '?'}:${point.offset}`;
  return (
    <View className="gap-1">
      {/* After Select All it holds the whole lab's text: it shows three lines of it (the element keeps all of it), so the lab still fits a 600 x 900 window. */}
      <Text testID="sel-readout" className="line-clamp-3 text-xs text-slate-900">
        {selection === undefined ? 'selected: nothing' : `selected: ${JSON.stringify(selection.text)}`}
      </Text>
      <Text testID="sel-ends" className="text-xs text-slate-500">
        {selection === undefined ? 'no ends' : `anchor ${where(selection.anchor)}, focus ${where(selection.focus)}${selection.isCollapsed ? ', collapsed' : ''}`}
      </Text>
    </View>
  );
}

/**
 * Phase I6: text selection. `select-text` opts text in; `select-none` opts a part of it out; a Button is never selectable.
 *
 * The verifier selects all and expects exactly the texts of `SELECTABLE_LAB_TEXTS` in document order, so nothing the lab adds to explain itself is
 * selectable: every caption sits outside the `select-text` boxes, and the boxes keep their order. It drives the lab in a 600 x 900 and a 1120 x 800
 * window without scrolling, so the captions are short and sit beside their case where the window has the room.
 */
export function SelectionLab() {
  const [count, setCount] = useState(0);
  const [showTail, setShowTail] = useState(true);
  const [showInserted, setShowInserted] = useState(false);
  const [counter, setCounter] = useState(INITIAL_COUNTER);
  useLayoutEffect(() => {
    controls = {
      changeLiveText: () => setCount(current => current + 1),
      removeTail: () => setShowTail(false),
      insertLine: () => setShowInserted(true),
      shrinkCounter: () => setCounter(SHRUNK_COUNTER),
    };
    return () => { controls = undefined; };
  }, []);
  return (
    <View testID="selection-lab" className="w-full min-h-full bg-slate-50 p-4 gap-2">
      <LabIntro title="Selecting text" paragraphs={INTRO} />
      <CaseRow caption={ARTICLE_CAPTION} controlClassName={COLUMN}>
        <View testID="selection-article" className={`select-text ${COLUMN} gap-2 rounded-xl border border-slate-200 bg-white p-3`}>
          <Text testID="sel-p1" className="text-sm text-slate-900">The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</Text>
          <Text testID="sel-none" className="select-none text-sm text-slate-400">This sentence is select-none: a selection runs past it and skips it.</Text>
          <Text testID="sel-p2" className="text-sm text-slate-900">Sphinx of black quartz, judge my vow. A backpack 🎒 is two UTF-16 units. How vexingly quick daft zebras jump!</Text>
          {showInserted ? <Text testID="sel-inserted" className="text-sm text-slate-900">An inserted line.</Text> : null}
          <Text testID="sel-live" className="text-sm text-slate-900">{`Live line ${count}`}</Text>
          {showTail ? <Text testID="sel-tail" className="text-sm text-slate-900">The tail paragraph can be removed.</Text> : null}
          <Button testID="sel-button" className="self-start rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500">Buttons are never selectable</Button>
        </View>
      </CaseRow>
      <Text testID="sel-plain" className={`${COLUMN} text-sm text-slate-600`}>Outside the card, with no select-text: not selectable.</Text>
      <CaseRow caption={POINTER_CAPTION} controlClassName={COLUMN}>
        <View className={`${COLUMN} flex-row items-start gap-3`}>
          <View
            testID="sel-captor"
            className="select-text min-w-0 flex-1 rounded-lg border border-indigo-200 bg-white p-1"
            onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)}
          >
            <Text testID="sel-captured" className="text-sm text-slate-900">Its element captures the pointer: no selection.</Text>
          </View>
          <View testID="sel-vetoer" className="select-text min-w-0 flex-1 rounded-lg border border-rose-200 bg-white p-1" onPointerDown={event => event.preventDefault()}>
            <Text testID="sel-prevented" className="text-sm text-slate-900">Its element prevents pointerdown: no selection.</Text>
          </View>
        </View>
      </CaseRow>
      <CaseRow caption={HIGHLIGHT_CAPTION}>
        <View className="flex-row items-start gap-3">
          <Text testID="sel-short" className="select-text self-start rounded bg-white px-1 text-sm text-slate-900">Highlight</Text>
          <Text testID="sel-rose" className="select-text selection-[#f43f5e80] self-start rounded bg-white px-1 text-sm text-slate-900">Rose highlight</Text>
          <Text testID="sel-counter" className="select-text self-start rounded bg-white px-1 text-sm text-slate-900">{counter}</Text>
        </View>
      </CaseRow>
      <CaseRow caption={LIST_CAPTION} controlClassName={COLUMN}>
        <ScrollView testID="sel-scroll" className={`select-text h-24 ${COLUMN} rounded-xl border border-slate-200 bg-white`} contentClassName="gap-1 p-2">
          {indexes(LIST_ROWS).map(index => (
            <Text key={index} testID={`sel-row-${index}`} className="self-start text-sm text-slate-900">{`Scrolling row ${index}`}</Text>
          ))}
        </ScrollView>
      </CaseRow>
      <ReadoutHeading>What useTextSelection() reports: the selected text and where its two ends are.</ReadoutHeading>
      <SelectionReadout />
      <Text className="text-xs text-slate-500">{VERIFIER_NOTE}</Text>
    </View>
  );
}
