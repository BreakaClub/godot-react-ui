import { useState } from 'react';
import { Button, ScrollView, Text, View } from '../../src';
import { LabIntro, LabLimit } from './lab-parts';
import { PAGES, textClassName, type TextPage, type TextSample } from './text-styles-data';

export interface TextStylesLabProps {
  page?: string;
}

const DEFAULT_PAGE_ID = PAGES[0]?.id ?? '';

/** What a visitor is told about the lab as a whole, above the first page. */
const INTRO = [
  'Every sample is a plain Text styled with Tailwind text classes, listed under each page. The page is drawn by the library, and the verifier renders the same classes as HTML in Chrome and holds every line\'s position, baseline and width to within one pixel of Chrome\'s, at device pixel ratios 1 and 2.',
  'The library\'s glyphs look about 12 percent lighter than Chrome\'s default font smoothing. They match Chrome\'s -webkit-font-smoothing: antialiased, which is why the antialiased class changes nothing. The pages are fixed-width columns: in a window narrower than a page the page pans sideways, and its own layout is not changed.',
];

/** What one page shows, and the limit it meets where it meets one. The pages' own titles and samples are `text-styles-data.ts`'s. */
export interface PageNote {
  readonly id: string;
  /** What the page shows and what to look at, in plain sentences. */
  readonly caption: string;
  /** A way the library differs from Chrome that the page shows, without the words "known limit". */
  readonly limit?: string;
}

export const PAGE_NOTES: readonly PageNote[] = [
  {
    id: 'weights-sans',
    caption: 'Open Sans is one variable font. Each sample asks for a weight, from font-thin at the top to font-black at the bottom, and the font draws it on its weight axis. This copy covers 300 to 800, so thin, extralight and light are the same face, and black is 800.',
  },
  {
    id: 'weights-faces',
    caption: 'PT Serif has two static faces, regular and bold, so the other weights use the nearest one as CSS font matching does: light, normal and medium draw the regular face and semibold, bold and black the bold one. JetBrains Mono is a variable font and draws each weight it is asked for.',
  },
  {
    id: 'styles',
    caption: 'italic uses a true italic face where the family has one (Open Sans) and a slant the library makes up where it does not (PT Serif and JetBrains Mono), as a browser does. not-italic under an italic parent turns it off. The last three rows use the engine\'s theme font, which Chrome does not have, so they are not compared with Chrome; font-bold on it changes nothing, as in a browser.',
  },
  {
    id: 'leading',
    caption: 'Line height, leading-none to leading-loose, on the same sentence at text-sm in a column of fixed width. Compare the gap between lines.',
  },
  {
    id: 'leading-lengths',
    caption: 'leading-3 to leading-10, a multiple of the font size (leading-[1.4]) and a length (leading-[22px]) on short text at text-xs; then text-sm/6 and text-sm/loose, which set the size and the line height together.',
  },
  {
    id: 'sizes',
    caption: 'text-xs to text-3xl. Each size carries Tailwind\'s line height, so a size sets how tall its lines are as well as the type.',
  },
  {
    id: 'tracking',
    caption: 'Letter spacing, tracking-tighter to tracking-widest, at text-sm and text-base. Fractions of a pixel are exact: tracking-tight at 14 px is 0.35 px tighter, and the lines match Chrome\'s widths to within a pixel.',
  },
  {
    id: 'tracking-more',
    caption: 'Letter spacing in em and px, a negative one, upper case with tracking-widest, wrapped text, and centred and right aligned tracked text.',
    limit: 'in the wrapped sample whose cell is 220 px wide, "over" ends half a pixel inside the edge. Chrome lets the space after it hang and keeps "over" on the line; the library counts the space and wraps one word early.',
  },
  {
    id: 'case',
    caption: 'uppercase, lowercase and capitalize change the text that is shown, and the shown text is what is selected and copied: select a line and copy it to get the transformed text. Straße becomes STRASSE, as in Chrome. normal-case under an uppercase parent turns it off.',
  },
  {
    id: 'decoration',
    caption: 'underline, overline and line-through with a colour, a thickness (decoration-2, decoration-4) and an offset. A decoration set on a parent draws on the text below it, and no-underline there cannot take it away, as in CSS.',
    limit: 'an underline is drawn whole. Chrome\'s default breaks it round descenders, the tails of g, j, p, q and y in the first sample.',
  },
  {
    id: 'overflow',
    caption: 'truncate and text-ellipsis end a line that is too long with an ellipsis, and text-clip cuts it plain. line-clamp-1, -2 and -3 limit a wrapped paragraph to that many lines and end the last with an ellipsis; line-clamp-none undoes it.',
  },
  {
    id: 'whitespace',
    caption: 'whitespace-normal, nowrap, pre, pre-line and pre-wrap on the same text, which has runs of spaces and line breaks. break-normal, break-words and break-all on one long word in a 100 px cell. text-justify and text-end.',
    limit: 'text wider than its box is cut at the box. The long word under break-normal is clipped at its cell, where Chrome lets it overflow into the next cell.',
  },
  {
    id: 'numerals',
    caption: 'Proportional digits (the default), tabular-nums, lining-nums, oldstyle-nums and slashed-zero. Compare the width of 1111 with that of 8888: they differ with proportional digits and match with tabular-nums.',
  },
];

function noteFor(page: TextPage): PageNote {
  const note = PAGE_NOTES.find(candidate => candidate.id === page.id);
  if (note === undefined) throw new Error(`The text styles lab has no note for the page "${page.id}"`);
  return note;
}

/**
 * One page of the text styles lab (`text-styles-data.ts`): a column of cells, each holding one text styled by the sample's
 * classes. The Chrome reference renders the same classes as HTML (`scripts/text-styles-reference.mjs`), so every number here
 * can be put beside a browser's. The `testID` of a text is its sample's id and the one of its cell is `cell-<id>`.
 *
 * When mounted without a `page` prop (e.g. in `demo/src/labs.tsx`), an interactive tab bar lets the user switch between pages, and the
 * page has its explanation around it. The verifiers mount the lab with a `page` and get the bare `Page`, which they measure against
 * Chrome pixel by pixel: nothing explains itself inside it. In the lab the page is in a box that pans sideways, so that a window
 * narrower than the page shows it at its real size and the page's own layout is untouched.
 */
export function TextStylesLab(props: TextStylesLabProps) {
  const { page: propPage } = props;
  const [selectedPage, setSelectedPage] = useState<string>(DEFAULT_PAGE_ID);
  const activePageId = propPage ?? selectedPage;
  const found = PAGES.find(candidate => candidate.id === activePageId);
  if (found === undefined) {
    throw new Error(`There is no text styles page "${activePageId}"; the pages are ${PAGES.map(each => each.id).join(', ')}`);
  }

  if (propPage !== undefined) {
    return <Page page={found} />;
  }

  const note = noteFor(found);
  return (
    <View testID="text-styles-lab" className="flex flex-col w-full h-full bg-slate-100 p-2 gap-2">
      <View className="flex flex-row flex-wrap gap-1 p-1 bg-white rounded border border-slate-200">
        {PAGES.map(page => (
          <Button
            key={page.id}
            testID={`tab-${page.id}`}
            className={`px-2 py-1 rounded ${page.id === activePageId ? 'bg-blue-600' : 'bg-gray-200'}`}
            onClick={() => setSelectedPage(page.id)}
          >
            <Text className={`text-xs ${page.id === activePageId ? 'text-white font-medium' : 'text-black'}`}>{page.id}</Text>
          </Button>
        ))}
      </View>
      <ScrollView className="flex-1 overflow-y-auto" contentClassName="gap-3 p-1">
        <LabIntro title="Text utilities, measured against Chrome" paragraphs={INTRO} />
        <View className="gap-1">
          <Text className="text-sm text-slate-900">{found.title}</Text>
          <Text className="text-sm text-slate-600">{note.caption}</Text>
          {note.limit === undefined ? null : <LabLimit>{note.limit}</LabLimit>}
        </View>
        <ScrollView horizontal testID="text-styles-pan">
          <Page page={found} />
        </ScrollView>
        <Legend page={found} />
      </ScrollView>
    </View>
  );
}

/** The classes of every sample of the page, in the order the page lays them out: the page itself carries no labels. */
function Legend({ page }: { page: TextPage }) {
  return (
    <View testID="text-styles-legend" className="gap-0.5">
      <Text className="text-xs text-slate-500">The samples above, in reading order:</Text>
      {page.samples.map((sample, index) => (
        <Text key={sample.id} className="text-xs text-slate-600">
          {`${index + 1}. ${sample.note}${sample.themeFont === true ? ' (not compared with Chrome)' : ''}`}
        </Text>
      ))}
    </View>
  );
}

function Page({ page }: { page: TextPage }) {
  return (
    <View testID={`page-${page.id}`} className={page.className}>
      {page.samples.map(sample => <Cell key={sample.id} sample={sample} />)}
    </View>
  );
}

function Cell({ sample }: { sample: TextSample }) {
  const text = <Text testID={sample.id} className={textClassName(sample)}>{sample.text}</Text>;
  return (
    <View testID={`cell-${sample.id}`} className={sample.cellClassName ?? 'flex flex-col'}>
      {sample.parentClassName === undefined ? text : <View testID={`parent-${sample.id}`} className={`flex flex-col ${sample.parentClassName}`}>{text}</View>}
    </View>
  );
}
