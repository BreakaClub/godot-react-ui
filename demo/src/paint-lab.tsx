import { useState } from 'react';
import { Button, Text, View, type Style } from 'godot-react-ui';
import { PAINT_PAGES, PAINT_STAGE, type PaintPage } from './paint-data';

/**
 * The paint lab (`docs/tracks/utilities-paint.md`): one page of boxes at a time, each with the Tailwind classes under test
 * (shadows, rings, outlines, borders and corners by side, gradients) on a backdrop, and no text. `scripts/paint-reference.mjs`
 * builds the same pages for Chrome from `paint-data.ts`, and the `paint` verifier section holds the two rasters together.
 *
 * One more page, after the others, is not in Chrome's set: the states page, whose boxes change with the pointer and the keyboard
 * (a hover that changes a shadow and a ring, a focus that adds an outline or changes a ring, a transition of the shadow) and
 * the boxes that must not draw outside something (a scroll container's clip, a filter group's extent).
 */

/** The name of the states page; the others are named in `paint-data.ts`. */
export const PAINT_STATES_PAGE = 'states';

const STAGE_STYLE: Style = { left: 0, top: 0, width: PAINT_STAGE.width, height: PAINT_STAGE.height, backgroundColor: '#f1f5f9' };

function Page({ page }: { page: PaintPage }) {
  return (
    <View testID="paint-stage" className="absolute overflow-hidden" style={{ ...STAGE_STYLE, backgroundColor: page.base }}>
      {(page.shapes ?? []).map((shape, index) => (
        <View
          // The shapes of a page are fixed and never reorder.
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          testID={`paint-shape-${index}`}
          className="absolute"
          style={{
            left: shape.left, top: shape.top, width: shape.width, height: shape.height,
            backgroundColor: shape.colour, ...(shape.radius === undefined ? {} : { borderRadius: shape.radius }),
          }}
        />
      ))}
      {page.cells.map(cell => (
        <View
          key={cell.id}
          testID={cell.id}
          className={`absolute ${cell.className}`}
          style={{ left: cell.left, top: cell.top, width: cell.width, height: cell.height, ...cell.inline }}
        />
      ))}
    </View>
  );
}

/** The boxes of the states page, with the size and place each is read at. */
export const STATES_LAYOUT = {
  hover: { left: 24, top: 24, width: 96, height: 64 },
  transition: { left: 176, top: 24, width: 96, height: 64 },
  plain: { left: 24, top: 130, width: 72, height: 40 },
  none: { left: 112, top: 130, width: 72, height: 40 },
  authored: { left: 200, top: 130, width: 72, height: 40 },
  composed: { left: 24, top: 200, width: 72, height: 40 },
  clip: { left: 24, top: 270, width: 100, height: 70 },
  clipChild: { left: 10, top: 24, width: 40, height: 22 },
  group: { left: 190, top: 290, width: 48, height: 32 },
} as const;

function StatesPage() {
  const place = (box: { left: number; top: number; width: number; height: number }) => ({ left: box.left, top: box.top, width: box.width, height: box.height });
  return (
    <View testID="paint-stage" className="absolute overflow-hidden" style={STAGE_STYLE}>
      <View
        testID="paint-hover"
        className="absolute rounded-lg bg-white shadow-sm ring-1 ring-black/5 hover:shadow-xl hover:ring-2 hover:ring-indigo-500"
        style={place(STATES_LAYOUT.hover)}
      />
      <View
        testID="paint-transition"
        className="absolute rounded-lg bg-white shadow-sm hover:shadow-xl"
        style={{ ...place(STATES_LAYOUT.transition), transition: { properties: ['boxShadow'], durationMs: 400, easing: 'linear' } }}
      />
      <Button testID="paint-focus-plain" className="absolute rounded-md bg-white" style={place(STATES_LAYOUT.plain)} />
      <Button testID="paint-focus-none" className="absolute rounded-md bg-white outline-none" style={place(STATES_LAYOUT.none)} />
      <Button
        testID="paint-focus-authored"
        className="absolute rounded-md bg-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        style={place(STATES_LAYOUT.authored)}
      />
      <Button
        testID="paint-focus-ring"
        className="absolute rounded-md bg-white outline-none shadow-lg ring-1 ring-black/5 focus:ring-2 focus:ring-indigo-500"
        style={place(STATES_LAYOUT.composed)}
      />
      <View testID="paint-clip" className="absolute overflow-hidden rounded-lg bg-white" style={place(STATES_LAYOUT.clip)}>
        <View testID="paint-clip-child" className="absolute rounded bg-sky-500 shadow-[0_0_0_16px_#ef4444]" style={place(STATES_LAYOUT.clipChild)} />
      </View>
      <View testID="paint-group" className="absolute brightness-110" style={place(STATES_LAYOUT.group)}>
        <View testID="paint-group-child" className="absolute inset-0 rounded bg-white shadow-[0_0_0_10px_#2563eb]" />
      </View>
    </View>
  );
}

export function PaintLab({ page }: { page: string }) {
  if (page === PAINT_STATES_PAGE) return <StatesPage />;
  const found = PAINT_PAGES.find(candidate => candidate.name === page);
  if (found === undefined) throw new Error(`There is no paint page "${page}"`);
  return <Page page={found} />;
}

/** The pages the explorer lists: every page of `paint-data.ts`, then the states page. */
const EXPLORER_PAGES: readonly string[] = [...PAINT_PAGES.map(page => page.name), PAINT_STATES_PAGE];

/**
 * The lab in the navigator (`labs.tsx`): a row of buttons, one per page, and the page at the size the verifier and Chrome's reference
 * draw it. The verifiers do not use it; they ask for a page by name (`godotReactDemo.showPaintPage`), which is `PaintLab` alone.
 */
export function PaintExplorer() {
  const [page, setPage] = useState(EXPLORER_PAGES[0] ?? PAINT_STATES_PAGE);
  return (
    <View className="gap-4 p-4">
      <View className="flex-row flex-wrap gap-2">
        {EXPLORER_PAGES.map(name => (
          <Button
            key={name}
            testID={`paint-page-${name}`}
            className={`rounded-md border border-slate-300 px-3 py-1 ${name === page ? 'bg-indigo-600' : 'bg-white hover:bg-slate-100'}`}
            onClick={() => setPage(name)}
          >
            <Text className={`text-sm ${name === page ? 'text-white' : 'text-slate-800'}`}>{name}</Text>
          </Button>
        ))}
      </View>
      <View className="relative" style={{ width: PAINT_STAGE.width, height: PAINT_STAGE.height }}>
        <PaintLab page={page} />
      </View>
    </View>
  );
}
