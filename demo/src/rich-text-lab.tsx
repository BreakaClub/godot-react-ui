import { useState, type ReactNode } from 'react';
import { Button, Portal, ScrollView, Text, View, type UIHandle, type UIPointerEvent, type UITextPosition } from '../../src';
import type { LayoutRect } from '../../src/native';
import { LabIntro, LabLimit, Readout } from './lab-parts';
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
  /** With `file`: each line is one plain string, for the baseline the spans are measured against. */
  plain?: boolean;
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

/** What a visitor is told about the lab as a whole, above the first page. */
const INTRO = [
  'Nested Text is one paragraph: a Text inside a Text is a span, as a span inside a paragraph in HTML. Spans change colour, weight, slant, background and font family, and decorate with underlines (solid, double, dotted, dashed or wavy). An inlay is generated text that is shown in the paragraph and is not part of it.',
  'A code editor is built on this: one Text per line keeps columns exact, spans colour the syntax, wavy underlines mark errors and inlays show type hints. Chrome renders the same spans as HTML for the comparison. The pages are fixed-width columns: in a narrow window a page pans sideways.',
];

/** What one page shows, and the limit it meets where it meets one. The pages' own titles and samples are `rich-text-data.ts`'s. */
export interface PageNote {
  readonly id: string;
  /** What the page shows and what to look at, in plain sentences. */
  readonly caption: string;
  /** A way the library differs from Chrome that the page shows, without the words "known limit". */
  readonly limit?: string;
}

const TRANSPARENT_TEXT = 'The text is transparent on purpose, so that only the decoration is drawn.';
const DECORATION_GEOMETRY = 'Its thickness, offset and pattern are what Chrome draws, read off Chrome\'s pixels.';

export const PAGE_NOTES: readonly PageNote[] = [
  {
    id: 'colours',
    caption: 'A Text inside a Text is a span: the paragraph stays one text, shaped once, and each span can change colour, weight, slant, background or font family. Spans inside spans inherit what they do not set, and a background is drawn under the text. Click the code line or the prose: a blue bar marks where the caret goes, and the line above the page gives its offset.',
  },
  {
    id: 'columns',
    caption: 'In a monospace font each character is one column wide, and splitting a line into spans must not move any of them. The first two lines hold the same forty digits, one as a single run and one as ten spans, and end at the same column. In the third each of the first ten characters is its own span. The fourth is a line of TypeScript. Click a line to place a caret.',
  },
  {
    id: 'decorations-solid',
    caption: `Solid and double underlines, each at the automatic thickness and at 1, 2 and 4 px. ${TRANSPARENT_TEXT} ${DECORATION_GEOMETRY}`,
  },
  {
    id: 'decorations-dotted',
    caption: `Dotted and dashed underlines, in the same rows. ${TRANSPARENT_TEXT}`,
    limit: 'the pattern of a dotted or dashed line of automatic thickness, and where a dot or dash falls between device pixels, differ slightly from Chrome\'s.',
  },
  {
    id: 'decorations-wavy',
    caption: `Wavy underlines, the kind an editor draws under an error. ${TRANSPARENT_TEXT} The last row has spans inside the underlined span: the wave starts again at each one, as it does in Chrome.`,
  },
  {
    id: 'decorations-over',
    caption: `An overline in each style (solid, double, dotted, dashed and wavy) at a few thicknesses. ${TRANSPARENT_TEXT}`,
  },
  {
    id: 'decorations-through',
    caption: `A line through the text in each style, at the same thicknesses. ${TRANSPARENT_TEXT}`,
  },
  {
    id: 'decorations-more',
    caption: 'A double underline with an offset, a wavy underline under text you can see, and a wavy underline over a paragraph that wraps, where each line starts the wave again as Chrome does.',
  },
  {
    id: 'inlays',
    caption: 'An inlay is generated text shown in the paragraph that is not part of it, like the type hint an editor draws after a name. It is measured and wrapped with the text around it, but the caret, selection, copy and word boundaries skip it. Click a line: the caret goes to one side of an inlay, before or after, and the line above the page says which.',
  },
  {
    id: 'transformed',
    caption: 'The same queries under CSS transforms: a line scaled by one and a half, an empty text and a line turned a quarter. Click a line and the line above the page reports the caret position worked out for the transformed box. Not compared with Chrome.',
  },
  {
    id: 'glyphs',
    caption: 'Characters no font has. In the family with no fallback the engine draws a box that spells the code point. Han and Thai come from a system font where the platform has one; the Web has none, so Han comes from the font the page downloads (the Font fallback lab) and Thai stays a box. A coloured span or letter-spacing draws glyph by glyph and shows the same glyph. Not compared with Chrome.',
  },
  {
    id: 'changes',
    caption: 'Press Change tone. The first line\'s span changes colour from red to blue: the paragraph is repainted and not shaped again. The second line\'s span changes its text from x to xy: the paragraph is shaped again. Not compared with Chrome.',
  },
];

function noteFor(page: RichPage): PageNote {
  const note = PAGE_NOTES.find(candidate => candidate.id === page.id);
  if (note === undefined) throw new Error(`The rich text lab has no note for the page "${page.id}"`);
  return note;
}

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

function FileLines({ count, plain }: { count: number; plain: boolean }) {
  return (
    <View testID="file" className="flex flex-col bg-white p-2 select-text">
      {Array.from({ length: count }, (_, index) => {
        const pieces = FILE_LINE_SHAPES[index % FILE_LINE_SHAPES.length] ?? [];
        return (
          <Text key={index} className="font-mono text-sm leading-5 whitespace-pre text-slate-900 h-5">
            {plain
              ? pieces.map(([text]) => text).join('')
              : pieces.map(([text, className], piece) => (className === '' ? text : <Text key={piece} className={className}>{text}</Text>))}
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
 *
 * With a `page` the lab is the bare page, which the verifiers measure against Chrome pixel by pixel: nothing explains itself inside it.
 * Without one it has its tabs and each page has its explanation around it, and the page is in a box that pans sideways, so that a window
 * narrower than the page shows it at its real size and the page's own layout is untouched.
 */
export function RichTextLab(props: RichTextLabProps) {
  const { page: propPage, tone: propTone, word: propWord, file, plain } = props;
  const [selectedPage, setSelectedPage] = useState<string>(DEFAULT_PAGE_ID);
  const [ownTone, setOwnTone] = useState(0);
  const [mark, setMark] = useState<Mark | undefined>(undefined);
  const tone = propTone ?? ownTone;
  const word = propWord ?? tone;
  if (file !== undefined) return <FileLines count={file} plain={plain === true} />;
  const activeId = propPage ?? selectedPage;
  const page = PAGES.find(candidate => candidate.id === activeId);
  if (page === undefined) {
    throw new Error(`There is no rich text page "${activeId}"; the pages are ${PAGES.map(each => each.id).join(', ')}`);
  }
  if (propPage !== undefined) return <Page page={page} tone={tone} word={word} onMark={undefined} />;

  const note = noteFor(page);
  const clickable = page.samples.some(sample => sample.interact === true);
  // The bar is placed in root space from where the caret was when the click landed, so it must not outlive a scroll of either box.
  const clearMark = (): void => setMark(undefined);
  const toned = TONES[tone % TONES.length];
  const worded = TONES[word % TONES.length];
  if (toned === undefined || worded === undefined) throw new Error(`There is no tone ${tone} or word ${word}`);
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
      </View>
      <ScrollView className="flex-1 overflow-y-auto" contentClassName="gap-3 p-1" onScroll={clearMark}>
        <LabIntro title="Styled runs inside one paragraph" paragraphs={INTRO} />
        <View className="gap-1">
          <Text className="text-sm text-slate-900">{page.title}</Text>
          <Text className="text-sm text-slate-600">{note.caption}</Text>
          {note.limit === undefined ? null : <LabLimit>{note.limit}</LabLimit>}
        </View>
        {page.id === 'changes' ? (
          <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
            <Button testID="tone" className="px-3 py-2 rounded bg-amber-200 active:bg-amber-300" onClick={() => setOwnTone(value => value + 1)}>
              <Text className="text-xs text-black">Change tone</Text>
            </Button>
            <Readout label="Tone now" value={`span colour ${toned.colour}, word "${worded.word}"`} />
          </View>
        ) : null}
        {clickable ? (
          <Readout
            testID="mark-report" label="Caret"
            value={mark === undefined
              ? 'none yet: click a sample marked (click it) below'
              : `${mark.sample}: offset ${mark.position.offset}, side ${mark.position.side}; at x ${mark.rect.x.toFixed(2)}, y ${mark.rect.y.toFixed(2)}, ${mark.rect.height.toFixed(2)} tall`}
          />
        ) : null}
        <ScrollView horizontal testID="rich-text-pan" onScroll={clearMark}>
          <Page page={page} tone={tone} word={word} onMark={setMark} />
        </ScrollView>
        <Legend page={page} />
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

/** What each sample of the page is, in the order the page lays them out: the page itself carries no labels. */
function Legend({ page }: { page: RichPage }) {
  return (
    <View testID="rich-text-legend" className="gap-0.5">
      <Text className="text-xs text-slate-500">The samples above, in reading order:</Text>
      {page.samples.map((sample, index) => (
        <Text key={sample.id} className="text-xs text-slate-600">{`${index + 1}. ${sample.note}${sample.interact === true ? ' (click it)' : ''}`}</Text>
      ))}
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
