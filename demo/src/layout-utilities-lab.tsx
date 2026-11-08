import { useState } from 'react';
import { Button, Text, View } from 'godot-react-ui';
import {
  CAPTION_CLASS, CELL_CLASS, LAYOUT_PAGES, PAGE_CLASS, TRANSITION_SCENARIOS, type LabBox, type LayoutPage, type LayoutPageName,
} from './layout-utilities-data';
import { LabIntro, LabLimit } from './lab-parts';

/**
 * The layout utilities lab (track utilities-layout-motion): pages of small stages, each exercising some of the layout
 * classes with boxes of fixed sizes, and a page of elements with transition classes that move on hover. `layout-utilities-data.ts`
 * is the page as data; `scripts/layout-utilities-reference.mjs` renders the same data as HTML under Tailwind's own CSS in
 * Chrome, and the `layout-utilities` verifier section compares every rectangle and the transitions' samples with it.
 *
 * The verifier and the reference compare `LayoutUtilitiesLab` and `TransitionClassesLab` bare, at their own 1120 px width, so what they
 * measure is not touched here. Everything that explains the pages is in `LayoutUtilitiesExplorer`, around them, and the explorer asks
 * the pages for the one change a phone needs (`explorer`): lay out at the window's width instead of 1120 px, so no page pans sideways.
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

/** The page's own classes, but as wide as the window: the stages keep their sizes and the rows of them wrap. */
const EXPLORER_PAGE_CLASS = 'flex-row flex-wrap content-start gap-4 p-4 bg-slate-100 w-full';
const HOVER_PREFIX = 'hover:';
const PRESS_PREFIX = 'active:';

/**
 * Every `hover:` class with an `active:` twin beside it, so a press shows what a hover shows on a screen that cannot hover. Only the
 * explorer asks for it: the transitions the verifier samples keep the classes the reference page has.
 */
function withPressTwins(className: string): string {
  return className
    .split(/\s+/)
    .flatMap(token => (token.startsWith(HOVER_PREFIX) ? [token, `${PRESS_PREFIX}${token.slice(HOVER_PREFIX.length)}`] : [token]))
    .join(' ');
}

export function LayoutUtilitiesLab({ page, explorer = false }: { page: LayoutPageName; explorer?: boolean }) {
  return (
    <View testID="layout-page" className={explorer ? EXPLORER_PAGE_CLASS : PAGE_CLASS}>
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
export function TransitionClassesLab({ explorer = false }: { explorer?: boolean }) {
  return (
    <View testID="transition-page" className={`flex-row flex-wrap content-start gap-4 p-4 bg-slate-100 ${explorer ? 'w-full' : 'w-[1120px]'}`}>
      {TRANSITION_SCENARIOS.map(scenario => (
        <View key={scenario.id} className="gap-1 shrink-0 w-[260px]">
          <Text className={CAPTION_CLASS}>{scenario.title}</Text>
          <View testID={`transition.${scenario.id}`} className={explorer ? withPressTwins(scenario.className) : scenario.className}>
            {scenario.inheritedText ? <Text testID={`transition.${scenario.id}.text`}>Aa</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const EXPLORER_PAGES: readonly LayoutUtilitiesPage[] = [...LAYOUT_PAGES.map(page => page.name), 'transitions'];

/** What each page shows, in a sentence or two, over the page. */
const PAGE_NOTES: Readonly<Record<LayoutUtilitiesPage, string>> = {
  margins: 'Auto margins in a column and in a row, negative and percentage margins, start and end margins and padding, arbitrary lengths, and a later class overriding an earlier one.',
  sizes: 'Fractions and size-*, w-min, w-max and w-fit, min and max limits, viewport units, when a flex item may shrink (min-w-0, overflow-hidden against overflow-clip), and flex grow, basis and shorthands.',
  grid: 'Track lists, spans and starts, auto flow and dense packing, auto-fill and minmax, and placing items with place-items, justify-self and content-*.',
  alignment: 'The eight content-* values on one wrapping row, justify-stretch and justify-normal, self-*, and order-* in a row, a column and a grid.',
  misc: 'invisible against hidden, overflow-clip, aspect ratios, box-border against box-content, block layout with margin collapse, and flow-root.',
  transitions: 'Each swatch changes from its resting style to its hover: style, with the transition classes written above it. Hover a swatch with a mouse; on a touch screen press and hold it, because this page adds an active: class beside every hover: class.',
};

/** The transition page's one known difference from Chrome (`docs/tracks/utilities-layout-motion.md`, "Limits that stay"). */
const TRANSITION_LIMIT = 'a width that goes from pixels to a percentage jumps to its new value where Chrome animates it (the transition-all swatch with hover:w-1/2); its colour still moves, and that is what is compared.';

/** The known differences of a page, one sentence each: the cases the verifier leaves out of its comparison with Chrome, and why. */
function pageLimits(page: LayoutUtilitiesPage): readonly string[] {
  if (page === 'transitions') return [TRANSITION_LIMIT];
  return layoutPage(page).cases.flatMap(entry => (entry.known === undefined ? [] : [`${entry.known} (the case "${entry.title}"; it is left out of the comparison).`]));
}

/**
 * The lab for the navigator: what it is, a button per page, what the page shows and where it differs from Chrome, then the page itself, laid out
 * at the window's width (a phone gets one stage under another and nothing to pan).
 */
export function LayoutUtilitiesExplorer() {
  const [page, setPage] = useState<LayoutUtilitiesPage>('margins');
  return (
    <View testID="layout-explorer" className="w-full min-h-full bg-slate-100">
      <View className="gap-3 p-4">
        <LabIntro
          title="Tailwind's layout classes, checked against Chrome"
          paragraphs={[
            'Each grey stage is a small fixed-size box with a few coloured boxes inside it, laid out by the classes written above it: margins, sizes, grid tracks, alignment, ordering and a few box-model switches. A class list longer than its stage is cut at the stage\'s edge.',
            'A verifier renders the same page as HTML under Tailwind\'s own CSS in headless Chrome and compares every box\'s rectangle with this library\'s native layout (Taffy), because a class should mean here what it means in a browser. Pick a page.',
          ]}
        />
        <View className="flex-row flex-wrap gap-2">
          {EXPLORER_PAGES.map(name => (
            <Button
              key={name}
              testID={`layout-page-${name}`}
              className={`rounded-md px-3 py-2 ${name === page ? 'bg-indigo-600' : 'bg-slate-300 hover:bg-slate-400 active:bg-slate-400'}`}
              onClick={() => setPage(name)}
            >
              <Text className={name === page ? 'text-sm text-white' : 'text-sm text-slate-800'}>{name}</Text>
            </Button>
          ))}
        </View>
        <Text testID="layout-page-note" className="text-sm text-slate-600">{PAGE_NOTES[page]}</Text>
        {pageLimits(page).map(limit => <LabLimit key={limit}>{limit}</LabLimit>)}
      </View>
      {page === 'transitions' ? <TransitionClassesLab explorer /> : <LayoutUtilitiesLab page={page} explorer />}
    </View>
  );
}
