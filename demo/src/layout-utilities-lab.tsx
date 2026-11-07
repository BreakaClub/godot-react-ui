import { useState } from 'react';
import { Button, Text, View } from 'godot-react-ui';
import {
  CAPTION_CLASS, CELL_CLASS, LAYOUT_PAGES, PAGE_CLASS, TRANSITION_SCENARIOS, type LabBox, type LayoutPage, type LayoutPageName,
} from './layout-utilities-data';

/**
 * The layout utilities lab (track utilities-layout-motion): pages of small stages, each exercising some of the layout
 * classes with boxes of fixed sizes, and a page of elements with transition classes that move on hover. `layout-utilities-data.ts`
 * is the page as data; `scripts/layout-utilities-reference.mjs` renders the same data as HTML under Tailwind's own CSS in
 * Chrome, and the `layout-utilities` verifier section compares every rectangle and the transitions' samples with it.
 */

function renderBox(box: LabBox) {
  return (
    <View key={box.id} testID={box.id} className={box.className}>
      {box.children?.map(renderBox)}
    </View>
  );
}

/** A page of the lab: one of the layout pages, or the transition scenarios. */
export type LayoutUtilitiesPage = LayoutPageName | 'transitions';

export function layoutPage(name: LayoutPageName): LayoutPage {
  const page = LAYOUT_PAGES.find(candidate => candidate.name === name);
  if (page === undefined) throw new Error(`No layout page named ${name}`);
  return page;
}

export function LayoutUtilitiesLab({ page }: { page: LayoutPageName }) {
  return (
    <View testID="layout-page" className={PAGE_CLASS}>
      {layoutPage(page).cases.map(entry => (
        <View key={entry.stage.id} className={CELL_CLASS}>
          <Text className={CAPTION_CLASS}>{entry.title}</Text>
          {renderBox(entry.stage)}
        </View>
      ))}
    </View>
  );
}

/** Elements with transition classes: hovering one moves it from its resting style to its `hover:` style. */
export function TransitionClassesLab() {
  return (
    <View testID="transition-page" className="flex-row flex-wrap content-start gap-4 p-4 bg-slate-100 w-[1120px]">
      {TRANSITION_SCENARIOS.map(scenario => (
        <View key={scenario.id} className="gap-1 shrink-0 w-[260px]">
          <Text className={CAPTION_CLASS}>{scenario.title}</Text>
          <View testID={`transition.${scenario.id}`} className={scenario.className}>
            {scenario.inheritedText ? <Text testID={`transition.${scenario.id}.text`}>Aa</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const EXPLORER_PAGES: readonly LayoutUtilitiesPage[] = [...LAYOUT_PAGES.map(page => page.name), 'transitions'];

/** The lab for the navigator: a button per page over the page, which keeps its own width and scrolls. */
export function LayoutUtilitiesExplorer() {
  const [page, setPage] = useState<LayoutUtilitiesPage>('margins');
  return (
    <View testID="layout-explorer" className="flex-1 min-h-0 bg-slate-100">
      <View className="flex-row flex-wrap gap-2 p-3 shrink-0">
        {EXPLORER_PAGES.map(name => (
          <Button
            key={name}
            testID={`layout-page-${name}`}
            className={`rounded-md px-3 py-1 ${name === page ? 'bg-indigo-600' : 'bg-slate-300 hover:bg-slate-400'}`}
            onClick={() => setPage(name)}
          >
            <Text className={name === page ? 'text-sm text-white' : 'text-sm text-slate-800'}>{name}</Text>
          </Button>
        ))}
      </View>
      <View className="flex-1 min-h-0 overflow-auto">
        {page === 'transitions' ? <TransitionClassesLab /> : <LayoutUtilitiesLab page={page} />}
      </View>
    </View>
  );
}
