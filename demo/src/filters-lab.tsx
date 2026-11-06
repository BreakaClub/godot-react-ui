import type { ReactNode } from 'react';
import { Portal, ScrollView, Text, View, useRootSize } from 'godot-react-ui';

/**
 * The page the `filters` verifier section drives (plan Phase V1). One component, rendered again with new props by
 * `godotReactDemo.showFilters(...)`, so a radius change goes through a real commit while a hover does not.
 *
 * Every fixture is built from hard edges and flat colours, so what the filters do to it can be read from pixels:
 * an edge's 10 to 90 width gives the blur's standard deviation, a flat patch gives a colour function's output.
 */
export type FiltersScene =
  | 'edge' | 'stack' | 'scroll' | 'portal' | 'native' | 'colour' | 'godot' | 'cost' | 'nested' | 'opacity' | 'text' | 'clip'
  | 'both' | 'blocked' | 'order' | 'corner' | 'edge-h' | 'fade' | 'busy' | 'text-change';

export interface FiltersLabProps {
  scene: FiltersScene;
  /** Blur radius in CSS pixels. */
  radius?: number;
  /** What carries the blur: the backdrop behind a panel, or the panel itself (its content is a hard edge). */
  target?: 'backdrop' | 'filter';
  /** `edge`: round the panel's corners, give it a translucent fill and a border, and put stripes behind it. */
  shape?: boolean;
  /** `colour`: one CSS filter list per cell. */
  values?: readonly string[];
  /** `cost`: how many panels, and their size. */
  panels?: number;
  width?: number;
  height?: number;
  /** `portal`, `scroll`, `nested`: which variant. */
  variant?: string;
  /** `scroll` (variant `moving`): the panel's `left`, in CSS pixels. */
  offset?: number;
  /** `both`, `blocked`: whether the element's `filter` (`both`) or the filter above the panel (`blocked`) is on. */
  filterOn?: boolean;
  /** `both`: whether the element's `backdrop-filter` is on. */
  backdropOn?: boolean;
  /** `fade`: the filtered element's opacity. */
  opacity?: number;
  /** `busy`: how many rows the filtered list has, and the width of the unrelated element beside it. */
  rows?: number;
  side?: number;
  /** `text-change`: the text of the fixed-size text node inside the filtered element. */
  text?: string;
}

/** The lab's panel: left and right 40 px of the window are left uncovered, and it is 180 px tall, so it fits a 400 px window (device pixel ratio two). */
export const PANEL_INSET = 40;
export const PANEL_TOP = 100;
export const PANEL_HEIGHT = 180;
/** The corner radius the shape variant uses. */
export const SHAPE_RADIUS = 32;
/** Width of one stripe in the stripes fixture. */
export const STRIPE_PX = 8;
export const COLOUR_CELL = 56;
export const COLOUR_COLUMNS = 6;
/** The swatches inside a colour cell: what the filter is applied to. */
export const SWATCH_COLOURS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'] as const;
export const HEADER_HEIGHT = 160;
export const SCROLLER_TOP = 100;
export const SCROLL_ROW = 100;
export const SCROLL_ROWS = 12;

/** A black and a white half meeting at the window's middle. */
function Edge() {
  return (
    <View className="absolute inset-0 flex-row">
      <View className="flex-1 bg-black" />
      <View className="flex-1 bg-white" />
    </View>
  );
}

/** Black and white stripes, `STRIPE_PX` wide, as many as fit in the root (a stripe that would not fit is left out). */
function Stripes() {
  const { width } = useRootSize();
  return (
    <View className="absolute inset-0 flex-row overflow-hidden">
      {Array.from({ length: Math.floor(width / STRIPE_PX) }, (_, index) => (
        <View key={index} className={index % 2 === 0 ? 'w-2 shrink-0 bg-black' : 'w-2 shrink-0 bg-white'} />
      ))}
    </View>
  );
}

const PANEL_CLASS = 'absolute left-[40px] right-[40px] top-[100px] h-[180px]';

function EdgeScene({ radius = 8, target = 'backdrop', shape = false }: FiltersLabProps) {
  const filter = `blur(${radius}px)`;
  const rounding = shape ? 'rounded-[32px] border-2 border-[#ff0000]' : '';
  if (target === 'filter') {
    // The panel's own content is the hard edge (it spans the root, so its own outer edges are as far from the middle as can be);
    // the page behind it is flat mid-grey.
    return (
      <View className="absolute inset-0 bg-slate-500">
        <View testID="panel" className="absolute left-0 right-0 top-[100px] h-[180px] flex-row" style={{ filter }}>
          <View className="flex-1 bg-black" />
          <View className="flex-1 bg-white" />
        </View>
      </View>
    );
  }
  return (
    <View className="absolute inset-0">
      {shape ? <Stripes /> : <Edge />}
      <View
        testID="panel"
        className={`${PANEL_CLASS} ${rounding} ${shape ? 'bg-[#ffffff33]' : ''}`}
        style={{ backdropFilter: radius === 0 ? 'none' : filter }}
      >
        {shape ? <Text testID="panel-text" className="p-4 text-sm text-white" style={{ userSelect: 'text' }}>Frosted glass over stripes</Text> : null}
      </View>
    </View>
  );
}

/** Panel A over the edge; panel B over A's right part. In B and A together the blurs add in variance. */
function StackScene({ radius = 8 }: FiltersLabProps) {
  const style = { backdropFilter: `blur(${radius}px)` };
  return (
    <View className="absolute inset-0">
      <Edge />
      <View testID="panel-a" className="absolute left-1/5 top-[60px] h-[300px] w-2/5 border border-[#ff0000]" style={style} />
      <View testID="panel-b" className="absolute left-2/5 top-[160px] h-[300px] w-2/5 border border-[#00aa00]" style={style} />
    </View>
  );
}

/** A tall list of black and white rows under a fixed header; a panel inside the list scrolls with it. */
function ScrollScene({ radius = 8, variant = 'header', offset = 0 }: FiltersLabProps) {
  const rows = Array.from({ length: SCROLL_ROWS }, (_, index) => index);
  return (
    <View className="absolute inset-0 bg-slate-500">
      <ScrollView testID="scroller" className="absolute left-[40px] top-[100px] h-[440px] w-[400px]" contentClassName="">
        {rows.map(row => (
          <View key={row} className={row % 2 === 0 ? 'h-[100px] bg-black' : 'h-[100px] bg-white'} />
        ))}
        {variant === 'inside' ? (
          <View testID="inner-panel" className="absolute left-[40px] top-[130px] h-[140px] w-[320px] rounded-[16px]" style={{ backdropFilter: `blur(${radius}px)` }} />
        ) : null}
      </ScrollView>
      {variant === 'header' ? (
        <View testID="header" className="absolute left-[40px] top-[100px] h-[160px] w-[400px]" style={{ backdropFilter: `blur(${radius}px)` }} />
      ) : null}
      {variant === 'moving' ? <MovingPanel radius={radius} offset={offset} /> : null}
    </View>
  );
}

/** A frosted panel whose `left` the verifier steps: the copy rectangle follows every position. */
export const MOVING_SIZE = 200;
export const MOVING_TOP = 200;
function MovingPanel({ radius, offset }: { radius: number; offset: number }) {
  return (
    <>
      <View className="absolute inset-0 flex-row">
        <View className="flex-1 bg-black" />
        <View className="flex-1 bg-white" />
      </View>
      <View
        testID="moving"
        className="absolute top-[200px] h-[200px] w-[200px]"
        style={{ left: offset, backdropFilter: `blur(${radius}px)` }}
      />
    </>
  );
}

/** A `fixed inset-0 backdrop-blur-sm` scrim in a Portal over the main layer's edge: a modal's backdrop. */
function PortalScene({ radius = 4 }: FiltersLabProps) {
  return (
    <View className="absolute inset-0">
      <Edge />
      <Portal>
        <View testID="scrim" className="fixed inset-0 bg-[#00000000]" style={{ backdropFilter: `blur(${radius}px)` }}>
          <View testID="dialog" className="absolute left-[200px] top-[300px] h-[100px] w-[200px] rounded-lg bg-white" />
        </View>
      </Portal>
    </View>
  );
}

/** Native state: a blur that grows and a brightness that changes on hover, with and without a transition. */
function NativeScene({ variant = 'backdrop' }: FiltersLabProps) {
  const fade = { properties: ['filter', 'backdropFilter'] as const, durationMs: 400, easing: 'linear' as const };
  return (
    <View className="absolute inset-0">
      <Edge />
      <View
        testID="hover-panel"
        className={variant === 'transition'
          ? 'absolute left-1/5 top-[100px] h-[200px] w-3/5 backdrop-blur-none hover:backdrop-blur-xl'
          : 'absolute left-1/5 top-[100px] h-[200px] w-3/5 backdrop-blur-sm hover:backdrop-blur-lg hover:backdrop-brightness-110'}
        style={variant === 'transition' ? { transition: fade } : undefined}
      />
      <View
        testID="filter-card"
        className="absolute left-[40px] top-[400px] h-[160px] w-[480px] flex-row blur-sm hover:brightness-110"
        style={variant === 'transition' ? { transition: fade } : undefined}
      >
        <View className="flex-1 bg-black" />
        <View className="flex-1 bg-[#3b82f6]" />
      </View>
    </View>
  );
}

/** Cells that each apply one CSS filter list to a card of four swatches, or to the backdrop behind it. */
function ColourScene({ values = [], target = 'filter' }: FiltersLabProps) {
  return (
    <View className="absolute inset-0 bg-slate-500">
      <View className="flex-row flex-wrap gap-4 p-4">
        {values.map((value, index) => (
          <View key={index} testID={`colour-${index}`} className="relative" style={{ width: COLOUR_CELL, height: COLOUR_CELL }}>
            {target === 'filter' ? (
              <View className="absolute inset-0 flex-row flex-wrap" style={{ filter: value }}>
                {SWATCH_COLOURS.map(colour => (
                  <View key={colour} style={{ width: COLOUR_CELL / 2, height: COLOUR_CELL / 2, backgroundColor: colour }} />
                ))}
              </View>
            ) : (
              <>
                <View className="absolute inset-0 flex-row flex-wrap">
                  {SWATCH_COLOURS.map(colour => (
                    <View key={colour} style={{ width: COLOUR_CELL / 2, height: COLOUR_CELL / 2, backgroundColor: colour }} />
                  ))}
                </View>
                <View className="absolute inset-0" style={{ backdropFilter: value }} />
              </>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

/** A transparent root over whatever Godot draws behind it, with a frosted panel across the middle third of the window (where the 3D box is). */
function GodotScene({ radius = 12 }: FiltersLabProps) {
  return (
    <View className="absolute inset-0">
      <View testID="panel" className="absolute left-[40px] right-[40px] top-1/3 h-1/3" style={{ backdropFilter: `blur(${radius}px)` }} />
    </View>
  );
}

/** Panels of one size and radius, for the cost measurement. */
function CostScene({ radius = 8, panels = 1, width = 400, height = 300, target = 'backdrop' }: FiltersLabProps) {
  return (
    <View className="absolute inset-0">
      <Stripes />
      {Array.from({ length: panels }, (_, index) => (
        <View
          key={index}
          testID={`cost-${index}`}
          className="absolute"
          style={target === 'backdrop'
            ? { left: 20 + index * 12, top: 20 + index * 12, width, height, backdropFilter: `blur(${radius}px)` }
            : { left: 20 + index * 12, top: 20 + index * 12, width, height, filter: `blur(${radius}px)` }}
        >
          {target === 'filter' ? <Edge /> : null}
        </View>
      ))}
    </View>
  );
}

/** Effects that cannot be drawn: a filter inside a filter, a backdrop-filter inside a filter. */
function NestedScene({ variant = 'filter-in-filter' }: FiltersLabProps) {
  return (
    <View className="absolute inset-0 bg-slate-500">
      <View testID="outer" className="absolute left-[40px] top-[40px] h-[300px] w-[400px] bg-white" style={{ filter: 'blur(4px)' }}>
        {variant === 'filter-in-filter'
          ? <View testID="inner" className="absolute left-[40px] top-[40px] h-[100px] w-[100px] bg-black" style={{ filter: 'blur(2px)' }} />
          : <View testID="inner" className="absolute left-[40px] top-[40px] h-[100px] w-[100px] bg-black" style={{ backdropFilter: 'blur(2px)' }} />}
      </View>
    </View>
  );
}

/** A filtered element whose blur reaches past an ancestor that clips: the clip still applies. */
function ClipScene({ radius = 16 }: FiltersLabProps) {
  return (
    <View className="absolute inset-0 bg-slate-500">
      <View testID="clipper" className="absolute left-[40px] top-[40px] h-[100px] w-[160px] overflow-hidden">
        <View testID="clipped" className="absolute left-[30px] top-[20px] h-[60px] w-[120px] bg-black" style={{ filter: `blur(${radius}px)` }} />
      </View>
    </View>
  );
}

/** A filtered element under an ancestor with opacity: the opacity must apply once. */
function OpacityScene({ radius = 4 }: FiltersLabProps) {
  return (
    <View className="absolute inset-0 bg-black">
      <View testID="faded" className="absolute left-[20px] top-[40px] h-[300px] w-[260px] opacity-50">
        <View testID="blurred" className="absolute left-[30px] top-[50px] h-[200px] w-[200px] bg-white" style={{ filter: `blur(${radius}px)` }} />
      </View>
      <View testID="plain" className="absolute left-[320px] top-[40px] h-[300px] w-[260px] opacity-50">
        <View className="absolute left-[30px] top-[50px] h-[200px] w-[200px] bg-white" />
      </View>
    </View>
  );
}

function TextScene({ radius = 12 }: FiltersLabProps) {
  return (
    <View className="absolute inset-0">
      <Stripes />
      <View testID="panel" className="absolute left-[40px] top-[200px] h-[120px] w-[480px] bg-[#ffffff33]" style={{ backdropFilter: `blur(${radius}px)` }}>
        <Text testID="panel-text" className="p-4 text-lg text-black" style={{ userSelect: 'text' }}>Selected text stays readable over the blur</Text>
      </View>
    </View>
  );
}

/** The shadow `both` puts on its panel: strong enough to read from a pixel under a panel whose fill is 20 % opaque. */
export const BOTH_SHADOW = 'drop-shadow(0px 10px 8px rgba(0,0,0,0.9))';
/** How far below the `both` panel's bottom edge the shadow is read, in CSS pixels. */
export const BOTH_SHADOW_PROBE_PX = 4;

/**
 * A translucent panel with both `filter` and `backdrop-filter` on the one element, as `backdrop-blur-xl drop-shadow-lg`
 * writes them. `filterOn` and `backdropOn` switch each, to take either away and bring it back.
 */
function BothScene({ radius = 12, filterOn = true, backdropOn = true, variant = 'style' }: FiltersLabProps) {
  const shape = `${PANEL_CLASS} rounded-[24px] bg-[#ffffff33]`;
  return (
    <View className="absolute inset-0">
      <Edge />
      {variant === 'classes'
        ? <View testID="panel" className={`${shape} backdrop-blur-xl drop-shadow-lg`} />
        : <View testID="panel" className={shape} style={{ backdropFilter: backdropOn ? `blur(${radius}px)` : 'none', filter: filterOn ? BOTH_SHADOW : 'none' }} />}
    </View>
  );
}

/** The edge scene's frosted panel inside an element that has a filter while `filterOn`: held back, and drawn when the filter goes. */
function BlockedScene({ radius = 8, filterOn = true }: FiltersLabProps) {
  return (
    <View className="absolute inset-0">
      <Edge />
      <View testID="outer" className="absolute inset-0" style={{ filter: filterOn ? 'blur(2px)' : 'none' }}>
        <View testID="panel" className={PANEL_CLASS} style={{ backdropFilter: `blur(${radius}px)` }} />
      </View>
    </View>
  );
}

/** A backdrop with no blur (it reads no mipmap) drawn before a filter group: the group must still read its mipmaps. */
function OrderScene({ radius = 8 }: FiltersLabProps) {
  return (
    <View className="absolute inset-0 bg-slate-500">
      <View testID="plain" className="absolute left-[10px] top-[10px] h-[60px] w-[120px] bg-[#336699]" style={{ backdropFilter: 'brightness(0.5)' }} />
      <View testID="panel" className="absolute left-0 right-0 top-[100px] h-[180px] flex-row" style={{ filter: `blur(${radius}px)` }}>
        <View className="flex-1 bg-black" />
        <View className="flex-1 bg-white" />
      </View>
    </View>
  );
}

/** The corner scene's panel: its left and top are near the target's origin, so the group's mip region starts left of and above it. */
export const CORNER_LEFT = 10;
export const CORNER_TOP = 10;
export const CORNER_HEIGHT = 180;
function CornerScene({ radius = 16, width = 312 }: FiltersLabProps) {
  return (
    <View className="absolute inset-0 bg-slate-500">
      <View testID="panel" className="absolute flex-row" style={{ left: CORNER_LEFT, top: CORNER_TOP, width, height: CORNER_HEIGHT, filter: `blur(${radius}px)` }}>
        <View className="flex-1 bg-black" />
        <View className="flex-1 bg-white" />
      </View>
    </View>
  );
}

/** The edge scene turned: black above, white below, so the blurred edge is read down a column. */
export const EDGE_H_LEFT = 40;
export const EDGE_H_WIDTH = 300;
function EdgeHorizontalScene({ radius = 12, target = 'backdrop' }: FiltersLabProps) {
  if (target === 'filter') {
    return (
      <View className="absolute inset-0 bg-slate-500">
        <View testID="panel" className="absolute bottom-[10%] top-[10%] flex-col" style={{ left: EDGE_H_LEFT, width: EDGE_H_WIDTH, filter: `blur(${radius}px)` }}>
          <View className="flex-1 bg-black" />
          <View className="flex-1 bg-white" />
        </View>
      </View>
    );
  }
  return (
    <View className="absolute inset-0">
      <View className="absolute inset-0 flex-col">
        <View className="flex-1 bg-black" />
        <View className="flex-1 bg-white" />
      </View>
      <View testID="panel" className="absolute bottom-[20%] top-[20%]" style={{ left: EDGE_H_LEFT, width: EDGE_H_WIDTH, backdropFilter: `blur(${radius}px)` }} />
    </View>
  );
}

/** A filtered element whose own opacity is `opacity`: at 0 the engine draws none of it, and a group around it must not either. */
function FadeScene({ radius = 4, opacity = 1 }: FiltersLabProps) {
  return (
    <View className="absolute inset-0 bg-white">
      <View testID="faded" className="absolute left-[40px] top-[40px] h-[120px] w-[160px] bg-black" style={{ filter: `blur(${radius}px)`, opacity }} />
    </View>
  );
}

/** A filtered list of `rows` rows beside an element whose `side` changes: a change there cannot move anything in the list. */
export const BUSY_ROW = 3;
function BusyScene({ rows = 400, side = 100 }: FiltersLabProps) {
  return (
    <View className="absolute inset-0 bg-white">
      <View testID="list" className="absolute left-[40px] top-[40px] w-[200px]" style={{ filter: 'blur(2px)' }}>
        {Array.from({ length: rows }, (_, index) => (
          <View key={index} className={index % 2 === 0 ? 'bg-black' : 'bg-slate-400'} style={{ height: BUSY_ROW }} />
        ))}
      </View>
      <View testID="unrelated" className="absolute left-[300px] top-[40px] h-[40px] bg-blue-500" style={{ width: side }} />
    </View>
  );
}

/** A fixed-size text node in a filtered box: more text overflows it without changing its size or its parent's. */
export const TEXT_CHANGE_TOP = 40;
export const TEXT_CHANGE_LEFT = 40;
export const TEXT_CHANGE_BOX = { width: 200, height: 30 } as const;
function TextChangeScene({ radius = 2, text = 'ok' }: FiltersLabProps) {
  return (
    <View className="absolute inset-0 bg-white">
      <View testID="holder" className="absolute" style={{ left: TEXT_CHANGE_LEFT, top: TEXT_CHANGE_TOP, ...TEXT_CHANGE_BOX, filter: `blur(${radius}px)` }}>
        <Text testID="fixed-text" className="h-[20px] w-[140px] text-lg text-black">{text}</Text>
      </View>
    </View>
  );
}

export function FiltersLab(props: FiltersLabProps): ReactNode {
  switch (props.scene) {
    case 'edge': return <EdgeScene {...props} />;
    case 'stack': return <StackScene {...props} />;
    case 'scroll': return <ScrollScene {...props} />;
    case 'portal': return <PortalScene {...props} />;
    case 'native': return <NativeScene {...props} />;
    case 'colour': return <ColourScene {...props} />;
    case 'godot': return <GodotScene {...props} />;
    case 'cost': return <CostScene {...props} />;
    case 'nested': return <NestedScene {...props} />;
    case 'opacity': return <OpacityScene {...props} />;
    case 'clip': return <ClipScene {...props} />;
    case 'text': return <TextScene {...props} />;
    case 'both': return <BothScene {...props} />;
    case 'blocked': return <BlockedScene {...props} />;
    case 'order': return <OrderScene {...props} />;
    case 'corner': return <CornerScene {...props} />;
    case 'edge-h': return <EdgeHorizontalScene {...props} />;
    case 'fade': return <FadeScene {...props} />;
    case 'busy': return <BusyScene {...props} />;
    case 'text-change': return <TextChangeScene {...props} />;
  }
}
