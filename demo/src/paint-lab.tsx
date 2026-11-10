import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Text, View, useRootSize, type Style, type UIHandle } from 'godot-react-ui';
import { LabCase, LabIntro, LabLimit } from './lab-parts';
import { PAINT_PAGES, PAINT_STAGE, type PaintCell, type PaintPage } from './paint-data';

/**
 * The paint lab: one page of boxes at a time, each with the Tailwind classes under test
 * (shadows, rings, outlines, borders and corners by side, gradients) on a backdrop, and no text. `scripts/paint-reference.mjs`
 * builds the same pages for Chrome from `paint-data.ts`, and the `paint` verifier section holds the two rasters together.
 *
 * One more page, after the others, is not in Chrome's set: the states page, whose boxes change with the pointer and the keyboard
 * (a hover that changes a shadow and a ring, a focus that adds an outline or changes a ring, a transition of the shadow) and
 * the boxes that must not draw outside something (a scroll container's clip, a filter group's extent). The two boxes that react to
 * the pointer also react to a press (`active:`), because a touch never hovers; the verifier only moves the pointer over them.
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
        className="absolute rounded-lg bg-white shadow-sm ring-1 ring-black/5 hover:shadow-xl hover:ring-2 hover:ring-indigo-500 active:shadow-xl active:ring-2 active:ring-indigo-500"
        style={place(STATES_LAYOUT.hover)}
      />
      <View
        testID="paint-transition"
        className="absolute rounded-lg bg-white shadow-sm hover:shadow-xl active:shadow-xl"
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

/** What the explorer says about a page. Captions are what the page shows and what to look at; `limit` is a difference from Chrome that stays. */
interface PageNote {
  readonly label: string;
  readonly caption: string;
  readonly expected?: string;
  readonly limit?: string;
}

const PAGE_NOTES: Readonly<Record<string, PageNote>> = {
  shadows: {
    label: 'Shadows',
    caption: 'Soft shadows under opaque white boxes: shadow-sm to shadow-2xl in the first two rows, then shadow-inner, a border with no shadow, a coloured shadow, an arbitrary one and a pill.',
    expected: "Each shadow is a soft Gaussian of the box's own rounded shape, wider and fainter as the size grows, as a browser draws it.",
  },
  'shadows-translucent': {
    label: 'See-through',
    caption: 'The same kinds of shadow under boxes that let the coloured stripes through: tinted boxes, a transparent one, a pill, a hard-edged offset shadow.',
    expected: 'A shadow is drawn only outside its box. Inside a see-through box you see the stripes, not a grey patch.',
  },
  'shadows-shapes': {
    label: 'Shapes',
    caption: 'Shadows follow the corners (rounded on one side, two opposite corners, square, a circle) and boxes of other sizes: tiny, a wide bar, a tall bar. The last box is wholly off the left edge of the stage, so only its shadow reaches in.',
    expected: "A shadow's edge follows the box's corners, and the box off the stage still casts its shadow into it, as in a browser.",
  },
  rings: {
    label: 'Rings',
    caption: "Rings from Tailwind's width scale (ring, ring-1, -2, -4, -8 and an arbitrary 6 px) with a colour and an opacity, inset rings, and rings with an offset, which leaves a gap in the offset's colour between the box and its ring.",
    expected: "A ring is a shadow with a spread: it follows the box's corners and moves nothing around it.",
  },
  'rings-shadows': {
    label: 'Rings + shadows',
    caption: 'A ring and a shadow on one box: the card pattern (a hairline ring with a soft shadow), heavier rings with larger shadows, an inset shadow with a ring, a pill, and an arbitrary two-layer shadow.',
    expected: 'Both are drawn. Neither replaces the other.',
  },
  outlines: {
    label: 'Outlines',
    caption: 'Outlines by width, offset (also negative), colour and corner radius: a 2 px outline plain, offset outwards and offset inwards, thicker and thinner ones, a translucent 8 px one, a pill, a box with one rounded side, then outline-0 and outline-none.',
    expected: 'An outline stands off the box by its offset, a negative offset draws it inside the edge, and the first two boxes of the last row have none.',
    limit: 'Dashed, dotted and double outlines are not drawn: the classes are rejected as unsupported.',
  },
  borders: {
    label: 'Borders',
    caption: 'Borders on one side or two (top, bottom, left, right, both sides, top and bottom) with their own widths and colours, then the same with rounded corners and a translucent one.',
    limit: "Where a one-sided border runs out along a curve (rounded-xl border-b-4, rounded-lg border-l-8, rounded-full border-b-4) our pixels differ from Chrome's by up to a quarter of the border's contrast, on a pixel or two.",
  },
  'borders-mixed': {
    label: 'Mixed borders',
    caption: 'Borders whose sides differ in colour or width, joined along mitres at the corners: four colours, rounded versions, unequal widths and translucent ones.',
    expected: 'Each corner is split along the diagonal between the two colours that meet there.',
    limit: 'Dashed, dotted and double borders are not drawn: the classes are rejected as unsupported.',
  },
  radii: {
    label: 'Radii',
    caption: 'Corner radii by side (top, right, bottom, left) and by corner, and combined with a border.',
    limit: "A plain rounded box is drawn by the engine's own box, whose arc sits 0.3 to 0.5 px inside Chrome's at 45 degrees: one to three pixels of each corner differ.",
  },
  gradients: {
    label: 'Gradients',
    caption: 'Linear gradients in all eight directions (to-t, to-tr, to-r, to-br, to-b, to-bl, to-l, to-tl, in that order), then three colour stops, stops with positions, white to black, and a colour fading to transparent.',
    expected: "A gradient is interpolated in sRGB along CSS's own gradient line, so each box matches a browser's.",
  },
  'gradients-rounded': {
    label: 'Rounded gradients',
    caption: 'Gradients with rounded corners, a border, transparency, a shadow, a ring and an inline backgroundImage: a pill, a bordered card, fades to transparent over a colour, and a hard stop at 50 percent.',
    limit: 'Beyond its padding box a gradient holds its end colours where CSS tiles the image. It shows only under a translucent border.',
  },
  glass: {
    label: 'Glass',
    caption: 'Frosted glass over four coloured circles: translucent fills, borders, backdrop blur of different strengths, a shadow, a ring and an outline on the same panels.',
    expected: "The circle behind a panel is blurred inside the panel only, and the panel's shadow is not drawn inside the glass.",
  },
  [PAINT_STATES_PAGE]: {
    label: 'States',
    caption: 'The one page Chrome is not asked to match: what changes with the pointer and the keyboard. The two white cards at the top grow a shadow (and, the left one, a ring) while the pointer is over them, or while you press and hold; the right one takes 400 ms. The four buttons need a keyboard: press Tab to move through them. The box at the bottom left must be clipped by its container, and the blue ring at the bottom right is drawn although its box sits in a filter group.',
    expected: 'Letting go puts the cards back. The first button has the native focus ring, the second none, the third an indigo outline, the fourth an indigo ring over its shadow.',
  },
};

function noteFor(name: string): PageNote {
  const note = PAGE_NOTES[name];
  if (note === undefined) throw new Error(`There is no explorer note for the paint page "${name}"`);
  return note;
}

/** The scale is rounded down to this many steps, so that a scaled stage never reaches past the box it is drawn in (as in the transforms lab). */
const FIT_STEPS = 10_000;
const SELECTED_COLOUR = '#f59e0b';
const SELECTED_OUTLINE: Style = { outlineStyle: 'solid', outlineWidth: 2, outlineColor: SELECTED_COLOUR, outlineOffset: 2 };

/** The classes and the inline styles that draw a box, as they were written. */
function describeBox(cell: PaintCell): string {
  const inline = Object.entries(cell.inline ?? {}).map(([property, value]) => `${property}: ${value}`);
  return [cell.className, ...inline].filter(part => part !== '').join('  +  ');
}

/** Whether any of a box is on the stage (one box of the shadows page is wholly off it, by design). */
function isOnStage(cell: PaintCell): boolean {
  return cell.left + cell.width > 0 && cell.top + cell.height > 0 && cell.left < PAINT_STAGE.width && cell.top < PAINT_STAGE.height;
}

interface PickedBoxProps {
  /** The classes and inline styles of the box that was picked, or the prompt to pick one. */
  value: string;
  /** Set once a box is picked: the colour of its outline on the stage. */
  colour?: `#${string}`;
}

/**
 * A named result in the manner of `Readout` (lab-parts.tsx), whose value may break inside a word: a class such as
 * `shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.2)]` has no space to wrap at and is wider than a phone, and `Readout` takes no class
 * to say `break-words` with.
 */
function PickedBox({ value, colour }: PickedBoxProps) {
  return (
    <View className="flex-row items-start gap-x-1.5">
      {colour === undefined ? null : <View className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: colour }} />}
      <Text className="shrink-0 text-xs text-slate-500">Box picked</Text>
      <Text testID="paint-selected" className="min-w-0 flex-1 break-words text-xs text-slate-900">{value}</Text>
    </View>
  );
}

interface StageFrameProps {
  /** How much of the stage's width the frame has: below 1 the stage is drawn smaller, about its top left corner. */
  fit: number;
  children: ReactNode;
}

/**
 * The stage at its own size, or under `scale(fit)` inside a box of the scaled size when the window is narrower than the stage (layout ignores
 * a transform, so the box has the scaled size and clips what layout still gives the stage). At 1 nothing is wrapped: the page is the one the
 * verifier measures.
 */
function StageFrame({ fit, children }: StageFrameProps) {
  const stage = (
    <View
      className="relative shrink-0"
      style={{ width: PAINT_STAGE.width, height: PAINT_STAGE.height, ...(fit === 1 ? {} : { transform: `scale(${fit})`, transformOrigin: 'top left' }) }}
    >
      {children}
    </View>
  );
  if (fit === 1) return stage;
  return <View className="shrink-0 overflow-hidden" style={{ width: PAINT_STAGE.width * fit, height: PAINT_STAGE.height * fit }}>{stage}</View>;
}

/**
 * The lab in the navigator (`labs.tsx`): a row of buttons, one per page, and the page at the size the verifier and Chrome's reference
 * draw it, with the classes of any box a tap or a Tab and Enter picks. The verifiers do not use it; they ask for a page by name
 * (`godotReactDemo.showPaintPage`), which is `PaintLab` alone: nothing of the explanation is inside `paint-stage`.
 */
export function PaintExplorer() {
  const [page, setPage] = useState(EXPLORER_PAGES[0] ?? PAINT_STATES_PAGE);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const { width: rootWidth } = useRootSize();
  const holder = useRef<UIHandle>(null);
  const [holderWidth, setHolderWidth] = useState<number>(PAINT_STAGE.width);
  // The stage is drawn as large as the card that holds it up to its own width: measure the card when the root's size changes (layout is done).
  useLayoutEffect(() => {
    const rect = holder.current?.getRect();
    if (rect !== undefined && rect.width > 0) setHolderWidth(rect.width);
  }, [rootWidth]);
  const fit = Math.min(1, Math.floor(holderWidth / PAINT_STAGE.width * FIT_STEPS) / FIT_STEPS);

  const note = noteFor(page);
  // The states page is the one whose boxes take the pointer and the keyboard themselves, so a layer above them to pick a box would hide that.
  const boxes = PAINT_PAGES.find(candidate => candidate.name === page)?.cells.filter(isOnStage) ?? [];
  const picked = boxes.find(cell => cell.id === selected);
  const choosePage = (name: string) => {
    setPage(name);
    setSelected(undefined);
  };

  return (
    <View testID="paint-explorer" className="gap-4 p-4">
      <LabIntro
        title="Boxes under test"
        paragraphs={[
          'Each page is a stage of small boxes, drawn by the library from the Tailwind classes under test: shadow, ring, outline, border, radius and gradient. The pages hold no text, so paint is the only thing to look at.',
          'The checks compare every page except States pixel by pixel with the same classes in headless Chrome, so a box here should look like the box in a browser. Pick a page, then tap a box to read its classes.',
        ]}
      />
      <View className="flex-row flex-wrap gap-2">
        {EXPLORER_PAGES.map(name => (
          <Button
            key={name}
            testID={`paint-page-${name}`}
            className={`rounded-md border border-slate-300 px-3 py-1 ${name === page ? 'bg-indigo-600' : 'bg-white hover:bg-slate-100 active:bg-slate-200'}`}
            onClick={() => choosePage(name)}
          >
            <Text className={`text-sm ${name === page ? 'text-white' : 'text-slate-800'}`}>{noteFor(name).label}</Text>
          </Button>
        ))}
      </View>
      <LabCase testID="paint-case" title={note.label} caption={note.caption} expected={note.expected}>
        <View ref={holder} className="w-full flex-row flex-wrap gap-4">
          <StageFrame fit={fit}>
            <PaintLab page={page} />
            {boxes.map(cell => (
              <Button
                key={cell.id}
                testID={`paint-inspect-${cell.id}`}
                aria-label={`Box: ${describeBox(cell)}`}
                className="absolute"
                style={{ left: cell.left, top: cell.top, width: cell.width, height: cell.height, ...(cell.id === selected ? SELECTED_OUTLINE : {}) }}
                onClick={() => setSelected(cell.id)}
              />
            ))}
          </StageFrame>
          <View className="min-w-[200px] flex-1 gap-2">
            {page === PAINT_STATES_PAGE ? null : (
              <PickedBox
                colour={picked === undefined ? undefined : SELECTED_COLOUR}
                value={picked === undefined ? 'none yet: tap a box on the stage' : describeBox(picked)}
              />
            )}
            {note.limit === undefined ? null : <LabLimit>{note.limit}</LabLimit>}
          </View>
        </View>
      </LabCase>
    </View>
  );
}
