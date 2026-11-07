import { useState, type ReactNode } from 'react';
import { Button, Portal, ScrollView, Text, View, type UIHandle, type UIPointerEvent, type UITextPosition } from '../../src';
import type { LayoutRect } from '../../src/native';
import { PAGES, PAGE_CLASS, TONES, span, type RichPage, type RichSample, type Run } from './rich-text-data';

export interface RichTextLabProps {
  /** Show this page alone, bare, as the verifier does; without it the lab has its tabs and controls. */
  page?: string;
  /** The tone the `recolour` sample has (an index of `TONES`); without it the lab's own button picks it. */
  tone?: number;
  /** The word the `retext` sample shows (an index of `TONES`), so that a change of the colour and a change of the text are different commits. Without it, the tone's. */
  word?: number;
  /** Show a file of this many lines of highlighted code, one `Text` a line, in place of the pages: the cost of a code view (`docs/tracks/rich-text.md`). */
  file?: number;
}

/** A line of code as spans: the shapes a highlighted TypeScript file is made of. Each is `[text, className]` pieces; `''` is no span. */
const FILE_LINE_SHAPES: readonly (readonly (readonly [string, string])[])[] = [
  [['import', 'text-purple-600'], [' { ', ''], ['useState', 'text-sky-700'], [' } ', ''], ['from', 'text-purple-600'], [' ', ''], ["'react'", 'text-green-700'], [';', '']],
  [['export', 'text-purple-600'], [' ', ''], ['function', 'text-purple-600'], [' ', ''], ['render', 'text-blue-700'], ['(', ''], ['props', 'text-orange-700'], [': ', ''], ['Props', 'text-teal-700'], [') {', '']],
  [['  ', ''], ['const', 'text-purple-600'], [' ', ''], ['total', 'text-sky-700'], [' = ', ''], ['items', 'text-sky-700'], ['.', ''], ['reduce', 'text-blue-700'], ['((', ''], ['a', 'text-orange-700'], [', ', ''], ['b', 'text-orange-700'], [') => a + b, ', ''], ['0', 'text-orange-600'], [');', '']],
  [['  ', ''], ['// the total of every item, in cents', 'text-slate-500 italic']],
  [['  ', ''], ['if', 'text-purple-600'], [' (', ''], ['total', 'text-sky-700'], [' > ', ''], ['100', 'text-orange-600'], [') ', ''], ['return', 'text-purple-600'], [' ', ''], ['null', 'text-orange-600'], [';', '']],
  [['  ', ''], ['return', 'text-purple-600'], [' ', ''], ['`${', 'text-green-700'], ['total', 'text-sky-700'], ['} items`', 'text-green-700'], [';', '']],
  [['}', '']],
  [['', '']],
];

const DEFAULT_PAGE_ID = PAGES[0]?.id ?? '';
const CARET_WIDTH_PX = 2;

/**
 * The handles of the lab's texts by test id (the sample's id), for the verifier, which calls their geometry queries. A handle is
 * stable for as long as its text is mounted.
 */
export const richTextHandles = new Map<string, UIHandle>();

function remember(id: string, handle: UIHandle | null): void {
  if (handle === null) richTextHandles.delete(id);
  else richTextHandles.set(id, handle);
}

/** The runs of a sample, with the tone the samples that change take. */
function runsOf(sample: RichSample, tone: number, word: number): readonly Run[] {
  const toned = TONES[tone % TONES.length];
  const worded = TONES[word % TONES.length];
  if (toned === undefined || worded === undefined) throw new Error(`There is no tone ${tone} or word ${word}`);
  if (sample.id === 'recolour') return ['let ', span(toned.colour, 'x'), ' = 1;'];
  if (sample.id === 'retext') return ['let ', span('text-red-600', worded.word), ' = 1;'];
  return sample.runs;
}

function Runs({ runs }: { runs: readonly Run[] }): ReactNode {
  return runs.map((run, index) => (typeof run === 'string'
    ? run
    : <Text key={index} className={run.className} inlay={run.inlay}><Runs runs={run.runs} /></Text>));
}

/** Where a click put the caret: the position the text reports and the rectangle it draws it in. */
interface Mark {
  readonly sample: string;
  readonly position: UITextPosition;
  readonly rect: LayoutRect;
}

function FileLines({ count }: { count: number }) {
  return (
    <View testID="file" className="flex flex-col bg-white p-2 select-text">
      {Array.from({ length: count }, (_, index) => {
        const pieces = FILE_LINE_SHAPES[index % FILE_LINE_SHAPES.length] ?? [];
        return (
          <Text key={index} className="font-mono text-sm leading-5 whitespace-pre text-slate-900 h-5">
            {pieces.map(([text, className], piece) => (className === '' ? text : <Text key={piece} className={className}>{text}</Text>))}
          </Text>
        );
      })}
    </View>
  );
}

/**
 * Rich text: one paragraph made of nested `Text`, with spans that colour, weight, slant, background and decorate, and inlays
 * that are shown but are not part of the text. Click a code line, a paragraph or a hint to see where the library puts the caret
 * (`getOffsetAtPoint` and `getCaretRect`) and which side of an inlay it is on. The Chrome reference
 * (`scripts/rich-text-reference.mjs`) renders the same samples as nested `<span>`s, so every number can be put beside a browser's.
 *
 * The `testID` of a text is its sample's id and the one of a page is `page-<id>`.
 */
export function RichTextLab(props: RichTextLabProps) {
  const { page: propPage, tone: propTone, word: propWord, file } = props;
  const [selectedPage, setSelectedPage] = useState<string>(DEFAULT_PAGE_ID);
  const [ownTone, setOwnTone] = useState(0);
  const [mark, setMark] = useState<Mark | undefined>(undefined);
  const tone = propTone ?? ownTone;
  const word = propWord ?? tone;
  if (file !== undefined) return <FileLines count={file} />;
  const activeId = propPage ?? selectedPage;
  const page = PAGES.find(candidate => candidate.id === activeId);
  if (page === undefined) {
    throw new Error(`There is no rich text page "${activeId}"; the pages are ${PAGES.map(each => each.id).join(', ')}`);
  }
  if (propPage !== undefined) return <Page page={page} tone={tone} word={word} onMark={undefined} />;

  return (
    <View testID="rich-text-lab" className="flex flex-col w-full h-full bg-slate-100 p-2 gap-2">
      <View className="flex flex-row flex-wrap items-center gap-1 p-1 bg-white rounded border border-slate-200">
        {PAGES.map(each => (
          <Button
            key={each.id}
            testID={`tab-${each.id}`}
            className={`px-2 py-1 rounded ${each.id === activeId ? 'bg-blue-600' : 'bg-gray-200'}`}
            onClick={() => { setSelectedPage(each.id); setMark(undefined); }}
          >
            <Text className={`text-xs ${each.id === activeId ? 'text-white font-medium' : 'text-black'}`}>{each.id}</Text>
          </Button>
        ))}
        <Button testID="tone" className="px-2 py-1 rounded bg-amber-200 ml-2" onClick={() => setOwnTone(value => value + 1)}>
          <Text className="text-xs text-black">Change tone (the Changes page)</Text>
        </Button>
      </View>
      <Text testID="mark-report" className="text-xs text-slate-700 font-mono">
        {mark === undefined
          ? 'Click a line to put a caret in it.'
          : `${mark.sample}: offset ${mark.position.offset}, side ${mark.position.side}; caret at x ${mark.rect.x.toFixed(2)}, y ${mark.rect.y.toFixed(2)}, ${mark.rect.height.toFixed(2)} tall`}
      </Text>
      <ScrollView className="flex-1 overflow-y-auto">
        <Page page={page} tone={tone} word={word} onMark={setMark} />
      </ScrollView>
      {mark === undefined ? null : (
        // The rectangle is in the root's space, so it is drawn in the overlay layer, which has the root's origin.
        <Portal>
          <View
            testID="mark"
            className="absolute bg-blue-600 pointer-events-none"
            style={{ left: mark.rect.x - CARET_WIDTH_PX / 2, top: mark.rect.y, width: CARET_WIDTH_PX, height: mark.rect.height }}
          />
        </Portal>
      )}
    </View>
  );
}

interface PageProps {
  page: RichPage;
  tone: number;
  word: number;
  onMark: ((mark: Mark | undefined) => void) | undefined;
}

function Page({ page, tone, word, onMark }: PageProps) {
  return (
    <View testID={`page-${page.id}`} className={PAGE_CLASS}>
      {page.samples.map(sample => <Sample key={sample.id} sample={sample} tone={tone} word={word} onMark={onMark} />)}
    </View>
  );
}

function Sample({ sample, tone, word, onMark }: { sample: RichSample; tone: number; word: number; onMark: ((mark: Mark | undefined) => void) | undefined }) {
  const handle = (value: UIHandle | null): void => remember(sample.id, value);
  const click = (event: UIPointerEvent): void => {
    if (onMark === undefined || sample.interact !== true) return;
    const text = richTextHandles.get(sample.id);
    const position = text?.getOffsetAtPoint(event.x, event.y);
    const rect = position === undefined ? undefined : text?.getCaretRect(position.offset, position.side);
    if (position !== undefined && rect !== undefined) onMark({ sample: sample.id, position, rect });
  };
  return (
    <Text ref={handle} testID={sample.id} className={sample.className} onPointerDown={click}>
      <Runs runs={runsOf(sample, tone, word)} />
    </Text>
  );
}
