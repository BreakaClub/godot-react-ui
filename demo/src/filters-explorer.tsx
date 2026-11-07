import { useState } from 'react';
import { Select, Slider, Text, View } from 'godot-react-ui';
import { FiltersLab, type FiltersLabProps } from './filters-lab';

/**
 * The filters lab as something to look at: the fixtures the `filters` verifier drives (`filters-lab.tsx`), with a fixture menu and
 * a blur radius slider in place of the verifier's props. A fixture is built from hard edges and flat colours so the filter's
 * effect can be read from pixels, which is also what makes it easy to see.
 */

/** The color functions the `colour` fixture applies to a card of four swatches, one per cell. */
const COLOUR_FILTERS = [
  'none', 'grayscale(1)', 'sepia(1)', 'invert(1)', 'hue-rotate(90deg)', 'hue-rotate(180deg)',
  'saturate(2)', 'saturate(0.3)', 'brightness(1.5)', 'brightness(0.6)', 'contrast(2)', 'contrast(0.5)',
] as const;

interface Fixture {
  readonly id: string;
  readonly label: string;
  /** What the fixture shows, under the menu. */
  readonly caption: string;
  /** Whether the blur radius changes what it shows. */
  readonly usesRadius: boolean;
  readonly props: Omit<FiltersLabProps, 'radius'>;
}

const FIXTURES: readonly Fixture[] = [
  {
    id: 'frosted', label: 'Frosted panel', usesRadius: true, props: { scene: 'edge', target: 'backdrop', shape: true },
    caption: 'backdrop-filter: blur() behind a translucent, rounded panel with a border, over stripes.',
  },
  {
    id: 'backdrop-edge', label: 'Backdrop blur on an edge', usesRadius: true, props: { scene: 'edge', target: 'backdrop' },
    caption: 'The panel blurs what is behind it: a black and a white half meeting in the middle.',
  },
  {
    id: 'filter-edge', label: 'Filter on an element', usesRadius: true, props: { scene: 'edge', target: 'filter' },
    caption: 'filter: blur() blurs the panel itself and everything painted inside it.',
  },
  {
    id: 'stacked', label: 'Stacked panels', usesRadius: true, props: { scene: 'stack' },
    caption: 'The second panel blurs what the first already blurred, so the two radii add.',
  },
  {
    id: 'hover', label: 'Hover, no React', usesRadius: false, props: { scene: 'native', variant: 'backdrop' },
    caption: 'Move the pointer over the panel and the card: hover: classes change the filter natively, with no render.',
  },
  {
    id: 'transition', label: 'Hover transition', usesRadius: false, props: { scene: 'native', variant: 'transition' },
    caption: 'The same, with a 400 ms transition of the filter and the backdrop filter.',
  },
  {
    id: 'scroll', label: 'Under a scrolling list', usesRadius: true, props: { scene: 'scroll', variant: 'header' },
    caption: 'A header blurs the rows scrolling under it. Scroll the list.',
  },
  {
    id: 'colour', label: 'Colour functions', usesRadius: false, props: { scene: 'colour', values: COLOUR_FILTERS, target: 'filter' },
    caption: 'One filter list per cell: grayscale, sepia, invert, hue-rotate, saturate, brightness and contrast.',
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
  return (
    <View testID="filters-explorer" className="w-full h-full">
      <View className="flex-row flex-wrap items-center gap-x-6 gap-y-3 bg-white px-4 py-3">
        <Select.Root value={fixtureId} onValueChange={setFixtureId}>
          <Select.Trigger testID="filters-fixture" aria-label="Fixture" className="w-64">
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
      <Text testID="filters-caption" className="bg-white px-4 pb-3 text-xs text-slate-500">{fixture.caption}</Text>
      <View className="h-px shrink-0 bg-slate-200" />
      <View testID="filters-stage" className="relative flex-1 min-h-0 overflow-hidden">
        <FiltersLab {...fixture.props} radius={radius} />
      </View>
    </View>
  );
}
