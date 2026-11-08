import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, Select, Slider, Text, View, useRootSize, type UIHandle } from 'godot-react-ui';
import { FiltersLab, type FiltersLabProps } from './filters-lab';
import { LabIntro, LabLimit } from './lab-parts';

/**
 * The filters lab as something to look at: the fixtures the `filters` verifier drives (`filters-lab.tsx`), with a fixture menu and
 * a blur radius slider in place of the verifier's props, and a caption for what each fixture shows and what to expect. A fixture is
 * built from hard edges and flat colours so the filter's effect can be read from pixels, which is also what makes it easy to see.
 *
 * Nothing of `filters-lab.tsx` is changed for the explorer. Its scenes fill whatever box they are in, and a few place boxes at fixed
 * offsets and sizes, so each fixture's stage has the height its scene needs and, for the two that are wider than a phone, a width
 * the stage keeps (the window pans it sideways). The two hover fixtures are drawn by the explorer itself (`PressScene`): the same
 * classes as the verifier's `native` scene plus `active:`, because a touch never hovers.
 */

/** The color functions the `colour` fixture applies to a card of four swatches, one per cell. */
const COLOUR_FILTERS = [
  'none', 'grayscale(1)', 'sepia(1)', 'invert(1)', 'hue-rotate(90deg)', 'hue-rotate(180deg)',
  'saturate(2)', 'saturate(0.3)', 'brightness(1.5)', 'brightness(0.6)', 'contrast(2)', 'contrast(0.5)',
] as const;

/** How long the `transition` fixture takes to change its filters (the verifier's `native` scene uses the same). */
const PRESS_FADE_MS = 400;

/**
 * The verifier's `native` scene with `active:` next to every `hover:`: a panel whose backdrop blur and brightness change while the pointer is
 * over it or pressed, and a blurred card that brightens. A class change here is resolved natively; React does nothing while it happens.
 */
function PressScene({ variant }: { variant: 'backdrop' | 'transition' }) {
  const fade = { properties: ['filter', 'backdropFilter'] as const, durationMs: PRESS_FADE_MS, easing: 'linear' as const };
  const slow = variant === 'transition';
  return (
    <View className="absolute inset-0">
      <View className="absolute inset-0 flex-row">
        <View className="flex-1 bg-black" />
        <View className="flex-1 bg-white" />
      </View>
      <View
        testID="press-panel"
        className={slow
          ? 'absolute left-1/5 top-[100px] h-[200px] w-3/5 backdrop-blur-none hover:backdrop-blur-xl active:backdrop-blur-xl'
          : 'absolute left-1/5 top-[100px] h-[200px] w-3/5 backdrop-blur-sm hover:backdrop-blur-lg hover:backdrop-brightness-110 active:backdrop-blur-lg active:backdrop-brightness-110'}
        style={slow ? { transition: fade } : undefined}
      />
      <View
        testID="press-card"
        className="absolute left-[40px] top-[400px] h-[160px] w-[480px] flex-row blur-sm hover:brightness-110 active:brightness-110"
        style={slow ? { transition: fade } : undefined}
      >
        <View className="flex-1 bg-black" />
        <View className="flex-1 bg-[#3b82f6]" />
      </View>
    </View>
  );
}

/**
 * The size a scene needs: its height is where its lowest box ends plus a margin; `minWidth` is where its widest fixed-size box ends (the
 * `native` scene's card is 480 wide at 40, the `scroll` scene's list 400 wide at 40), 0 for scenes that follow the width.
 */
const STAGES = {
  edge: { height: 360, minWidth: 0 },
  stack: { height: 500, minWidth: 0 },
  press: { height: 600, minWidth: 560 },
  scroll: { height: 580, minWidth: 480 },
  colour: { height: 260, minWidth: 0 },
} as const;

interface Fixture {
  readonly id: string;
  readonly label: string;
  /** What the fixture shows, and what to try. */
  readonly caption: string;
  /** What should happen, when it is not obvious. */
  readonly expected: string;
  /** A difference from a browser that the fixture shows. */
  readonly limit?: string;
  /** Whether the blur radius changes what it shows. */
  readonly usesRadius: boolean;
  readonly stage: { readonly height: number; readonly minWidth: number };
  readonly draw: (radius: number) => ReactNode;
}

function scene(props: Omit<FiltersLabProps, 'radius'>): (radius: number) => ReactNode {
  return radius => <FiltersLab {...props} radius={radius} />;
}

const FIXTURES: readonly Fixture[] = [
  {
    id: 'frosted', label: 'Frosted panel', usesRadius: true, stage: STAGES.edge,
    caption: 'A frosted-glass panel: a see-through white fill, a red border and 32 px rounded corners over black and white stripes. Drag the radius slider; at 0 the stripes show plainly.',
    expected: "The stripes are blurred inside the panel's rounded border and stay sharp outside it, and the label stays crisp.",
    draw: scene({ scene: 'edge', target: 'backdrop', shape: true }),
  },
  {
    id: 'backdrop-edge', label: 'Backdrop blur on an edge', usesRadius: true, stage: STAGES.edge,
    caption: 'A transparent panel over a black half and a white half that meet at the middle. The panel blurs what is behind it.',
    expected: 'Inside the panel the hard edge becomes a soft ramp about 2.6 times the radius wide (10 to 90 percent, the width of a Gaussian of that radius). Outside the panel the edge stays hard.',
    draw: scene({ scene: 'edge', target: 'backdrop' }),
  },
  {
    id: 'filter-edge', label: 'Filter on an element', usesRadius: true, stage: STAGES.edge,
    caption: 'A panel that carries the filter itself: its own black and white halves are blurred, edges included, over a flat grey page that is not touched.',
    expected: "The black and white meet in the same soft ramp, and the panel's outer edges blur into the grey.",
    limit: `At the window's edge the blur reads the edge pixels again, where a browser blurs the part beyond the edge, so the panel's outer edges there differ from Chrome's (docs/tracks/filters.md, "Limits found").`,
    draw: scene({ scene: 'edge', target: 'filter' }),
  },
  {
    id: 'stacked', label: 'Stacked panels', usesRadius: true, stage: STAGES.stack,
    caption: 'Two backdrop-blurred panels overlap, the second over the right part of the first. The second blurs what the first already blurred.',
    expected: 'Where they overlap the edge is softer than under either panel alone, because the two blurs add.',
    draw: scene({ scene: 'stack' }),
  },
  {
    id: 'hover', label: 'Hover or press, no React', usesRadius: false, stage: STAGES.press,
    caption: 'Hover with a mouse, or press and hold with a finger, the upper panel and the striped card under it. hover: and active: classes change the backdrop blur, the brightness and the filter natively, with no React render. The card is blurred at rest too (blur-sm).',
    expected: 'While held, the panel blurs the edge behind it more and brightens it, and the card brightens. Letting go puts both back.',
    draw: () => <PressScene variant="backdrop" />,
  },
  {
    id: 'transition', label: 'Hover transition', usesRadius: false, stage: STAGES.press,
    caption: 'The same two parts with a 400 ms linear transition of the filter and the backdrop filter. The upper panel starts with no blur.',
    expected: 'The blur grows over 400 ms while you hover or hold, and fades back over 400 ms when you let go.',
    draw: () => <PressScene variant="transition" />,
  },
  {
    id: 'scroll', label: 'Under a scrolling list', usesRadius: true, stage: STAGES.scroll,
    caption: 'A header panel with a backdrop blur sits over a list of black and white rows. Scroll the list: drag it with a finger, or use the wheel.',
    expected: 'The rows are blurred where they pass under the header and sharp below it.',
    draw: scene({ scene: 'scroll', variant: 'header' }),
  },
  {
    id: 'colour', label: 'Colour functions', usesRadius: false, stage: STAGES.colour,
    caption: 'Twelve cells, each a card of four swatches (blue, red, green, amber) with one filter function applied. In order, across and then down: none, grayscale, sepia, invert, two hue-rotates, two saturates, two brightnesses and two contrasts.',
    expected: 'Compare each cell with the first: grayscale and saturate(0.3) drain the colour, sepia tints it brown, invert flips it, hue-rotate turns the hues, brightness and contrast lighten, darken, stretch or flatten.',
    draw: scene({ scene: 'colour', values: COLOUR_FILTERS, target: 'filter' }),
  },
];

const DEFAULT_FIXTURE = 'frosted';
const MIN_RADIUS = 0;
const MAX_RADIUS = 32;
const DEFAULT_RADIUS = 8;

function fixtureById(id: string): Fixture {
  const found = FIXTURES.find(fixture => fixture.id === id);
  if (found === undefined) throw new Error(`There is no filters fixture ${id}`);
  return found;
}

export function FiltersExplorer() {
  const [fixtureId, setFixtureId] = useState(DEFAULT_FIXTURE);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const fixture = fixtureById(fixtureId);
  const { width: rootWidth } = useRootSize();
  const box = useRef<UIHandle>(null);
  const [areaWidth, setAreaWidth] = useState(rootWidth);
  // The stage is as wide as the area the lab is in (a sidebar takes some of the window), or wider when its scene needs it: measure the lab
  // when the root's size changes (layout is already done).
  useLayoutEffect(() => {
    const rect = box.current?.getRect();
    if (rect !== undefined && rect.width > 0) setAreaWidth(rect.width);
  }, [rootWidth]);
  const stageWidth = Math.max(areaWidth, fixture.stage.minWidth);
  const pans = stageWidth > areaWidth;
  const stage = (
    <View testID="filters-stage" className="relative shrink-0 overflow-hidden" style={{ width: stageWidth, height: fixture.stage.height }}>
      {fixture.draw(radius)}
    </View>
  );
  return (
    <View ref={box} testID="filters-explorer" className="w-full">
      <View className="gap-3 bg-white px-4 py-3">
        <LabIntro
          title="Filters, read from pixels"
          paragraphs={[
            'A filter blurs or recolours an element and everything painted inside it. A backdrop filter does the same to whatever is already drawn behind an element, inside its rounded corners: that is frosted glass.',
            'Each fixture is made of hard black and white edges and flat colours, so what the filter did can be read straight off the pixels. The checks hold a blurred edge to a true Gaussian of the radius you set.',
          ]}
        />
        <View className="flex-row flex-wrap items-center gap-x-6 gap-y-3">
          <Select.Root value={fixtureId} onValueChange={setFixtureId}>
            <Select.Trigger testID="filters-fixture" aria-label="Fixture" className="w-64 max-w-full">
              <Select.Value />
              <Select.Icon />
            </Select.Trigger>
            <Select.Content testID="filters-fixture-list">
              {FIXTURES.map(item => (
                <Select.Item key={item.id} value={item.id} testID={`filters-fixture-${item.id}`}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <View className="flex-row items-center gap-3">
            <Text className="text-sm text-slate-600">Blur radius</Text>
            <Slider.Root
              testID="filters-radius" className="w-40" min={MIN_RADIUS} max={MAX_RADIUS} value={radius}
              disabled={!fixture.usesRadius} onValueChange={setRadius}
            >
              <Slider.Track>
                <Slider.Range />
                <Slider.Thumb aria-label="Blur radius" />
              </Slider.Track>
            </Slider.Root>
            <Text testID="filters-radius-value" className="w-12 text-sm text-slate-700">{fixture.usesRadius ? `${radius} px` : 'fixed'}</Text>
          </View>
        </View>
        <View className="gap-2">
          <Text testID="filters-caption" className="text-sm text-slate-600">{fixture.caption}</Text>
          <Text className="text-xs text-indigo-700">{`Expected: ${fixture.expected}`}</Text>
          {fixture.limit === undefined ? null : <LabLimit>{fixture.limit}</LabLimit>}
          {pans ? <Text className="text-xs text-slate-500">This fixture is wider than the window: drag the stage sideways to see all of it.</Text> : null}
        </View>
      </View>
      <View className="h-px shrink-0 bg-slate-200" />
      {pans ? (
        <ScrollView testID="filters-stage-scroll" horizontal className="w-full" style={{ height: fixture.stage.height }}>{stage}</ScrollView>
      ) : stage}
    </View>
  );
}
