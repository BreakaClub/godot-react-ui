import { useState } from 'react';
import { Button, ScrollView, Text, View } from '../../src';
import { PAGES, textClassName, type TextPage, type TextSample } from './text-styles-data';

export interface TextStylesLabProps {
  page?: string;
}

const DEFAULT_PAGE_ID = PAGES[0]?.id ?? '';

/**
 * One page of the text styles lab (`text-styles-data.ts`): a column of cells, each holding one text styled by the sample's
 * classes. The Chrome reference renders the same classes as HTML (`scripts/text-styles-reference.mjs`), so every number here
 * can be put beside a browser's. The `testID` of a text is its sample's id and the one of its cell is `cell-<id>`.
 *
 * When mounted without a `page` prop (e.g. in `demo/src/labs.tsx`), an interactive tab bar lets the user switch between pages.
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

  return (
    <View testID="text-styles-lab" className="flex flex-col w-full h-full bg-slate-100 p-2 gap-2">
      <View className="flex flex-row flex-wrap gap-1 p-1 bg-white rounded shadow-sm">
        {PAGES.map(page => (
          <Button
            key={page.id}
            testID={`tab-${page.id}`}
            className={`px-2 py-1 text-xs rounded ${page.id === activePageId ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'}`}
            onClick={() => setSelectedPage(page.id)}
          >
            {page.id}
          </Button>
        ))}
      </View>
      <ScrollView className="flex-1 overflow-y-auto">
        <Page page={found} />
      </ScrollView>
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
