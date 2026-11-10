import { useState } from 'react';
import { Button, ScrollView, Text, TextInput, View, useTextSelection, type UITextSelectionChangeEvent } from 'godot-react-ui';
import { LabIntro } from './lab-parts';
import { CaseRow, ReadoutHeading } from './text-lab-parts';

/** How many rows the scrolling list has: more than fit, so the selection can be scrolled out of view and autoscrolled into it. */
const LIST_ROWS = 14;
/** The text area is this many lines tall and holds more lines than that. */
const AREA_ROWS = 3;
/** Spaces in the JSON readout's indentation. */
const JSON_INDENT = 0;

const AREA_TEXT = 'one two three\nfour five six\nseven eight nine\nten eleven twelve\nthirteen fourteen fifteen';
/** The width of every control: a phone's width less the page's padding, up to a size a thumb reaches across. */
const COLUMN = 'w-full max-w-[420px]';
const FIELD = `${COLUMN} rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 caret-indigo-600 focus:border-indigo-500`;
const INTRO = [
  'Press and hold a word for half a second to select it, as on a phone. Drag the handles, use the menu, tap elsewhere to clear.',
];
const CARD_CAPTION = 'Hold a word in the white card: it is selected, with a handle at each end and a menu above it once you lift. Holding a space selects nothing.';
const FIELD_CAPTION = 'Hold a word: the field selects it and the menu adds Cut and Paste. A tap only places the caret.';
const AREA_CAPTION = 'Hold a word, then drag its end handle to the bottom edge: the text scrolls.';
const LIST_CAPTION = 'The same in a scrolling list; a handle scrolled out of view is hidden.';
const DRAG_CAPTION = 'Hold here: a draggable card starts a drag, not a selection.';
const TOGGLE_CAPTION = 'Read-only drops Cut and Paste from the field\'s menu; not selectable leaves nothing to hold in the white card.';
const READOUT_HEADING = 'Readout: selected text, field offsets (line), text area offsets (area).';
const READOUT_NOTE = 'Select All in the menu takes every selectable text on the page. Nothing accepts the draggable card\'s drop. '
  + 'This is the library\'s own touch selection, modelled on the long press, handles and menu of iOS and Android. It needs a touch screen or touch emulation: a mouse selects the way the Text selection lab shows.';
const TOGGLE = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';

function indexes(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

interface Range {
  start: number;
  end: number;
}

/**
 * Touch text selection: press and hold a word of the card, the field, the text area or the list to
 * select it, drag the handles, tap Copy or Select All in the menu, tap elsewhere to clear. The readout is the document's selection and
 * each field's, as JSON, which the verifiers parse. A draggable card holds selectable text and drags when held: the hold is the drag's. The two toggles change what the menu may offer: a read-only field has no Cut or
 * Paste, and a card that is not selectable has nothing to hold.
 */
export function TouchSelectionLab() {
  const selection = useTextSelection();
  const [line, setLine] = useState<Range>({ start: 0, end: 0 });
  const [area, setArea] = useState<Range>({ start: 0, end: 0 });
  const [readOnly, setReadOnly] = useState(false);
  const [selectable, setSelectable] = useState(true);
  const track = (set: (range: Range) => void) => (event: UITextSelectionChangeEvent) => set({ start: event.selectionStart, end: event.selectionEnd });
  const readout = JSON.stringify({
    selected: selection === undefined ? null : selection.text,
    line,
    area,
  }, null, JSON_INDENT);
  return (
    <View testID="touch-selection-lab" className="w-full h-full bg-slate-50 relative">
      <ScrollView testID="touch-selection-page" className="absolute inset-0" contentClassName="p-4 gap-3">
        <LabIntro title="Touch selection" paragraphs={INTRO} />
        <CaseRow caption={CARD_CAPTION} controlClassName={COLUMN}>
          <View testID="ts-article" className={`${selectable ? 'select-text' : 'select-none'} ${COLUMN} gap-2 rounded-xl border border-slate-200 bg-white p-3`}>
            <Text testID="ts-p1" className="text-sm text-slate-900">The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</Text>
            <Text testID="ts-p2" className="text-sm text-slate-900">Sphinx of black quartz, judge my vow. How vexingly quick daft zebras jump!</Text>
          </View>
        </CaseRow>
        <CaseRow caption={FIELD_CAPTION} controlClassName={COLUMN}>
          <TextInput
            testID="ts-input" className={FIELD} defaultValue="alpha beta gamma delta epsilon zeta eta theta" readOnly={readOnly}
            onSelectionChange={track(setLine)}
          />
        </CaseRow>
        <CaseRow caption={AREA_CAPTION} controlClassName={COLUMN}>
          <TextInput
            testID="ts-area" className={`${FIELD} h-auto`} multiline rows={AREA_ROWS} defaultValue={AREA_TEXT}
            onSelectionChange={track(setArea)}
          />
        </CaseRow>
        <CaseRow caption={LIST_CAPTION} controlClassName={COLUMN}>
          <ScrollView testID="ts-scroll" className={`select-text h-24 ${COLUMN} rounded-xl border border-slate-200 bg-white`} contentClassName="gap-1 p-2">
            {indexes(LIST_ROWS).map(index => (
              <Text key={index} testID={`ts-row-${index}`} className="self-start text-sm text-slate-900">{`Scrolling row ${index}`}</Text>
            ))}
          </ScrollView>
        </CaseRow>
        <CaseRow caption={DRAG_CAPTION} controlClassName={COLUMN}>
          <View
            testID="ts-draggable" draggable className={`select-text ${COLUMN} rounded-lg border border-indigo-300 bg-white p-2`}
            onDragStart={event => event.dataTransfer.setData('text/plain', 'card')}
          >
            <Text testID="ts-drag-text" className="text-sm text-slate-900">A draggable card: held, it drags; it does not select.</Text>
          </View>
        </CaseRow>
        <CaseRow caption={TOGGLE_CAPTION}>
          <View className="flex-row flex-wrap gap-2">
            <Button testID="ts-toggle-readonly" className={TOGGLE} onClick={() => setReadOnly(current => !current)}>
              {readOnly ? 'Field: read-only' : 'Field: editable'}
            </Button>
            <Button testID="ts-toggle-selectable" className={TOGGLE} onClick={() => setSelectable(current => !current)}>
              {selectable ? 'Card: selectable' : 'Card: not selectable'}
            </Button>
          </View>
        </CaseRow>
        <ReadoutHeading>{READOUT_HEADING}</ReadoutHeading>
        <Text testID="ts-readout" className="text-xs text-slate-600">{readout}</Text>
        <Text className="text-xs text-slate-500">{READOUT_NOTE}</Text>
        <View className="h-[1200px]" />
      </ScrollView>
    </View>
  );
}
