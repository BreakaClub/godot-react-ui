import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Button, Portal, ScrollView, Select, Text, TextInput, View, useRootSize,
  type Style, type UIDragEvent, type UIHandle, type UIPointerEvent,
} from 'godot-react-ui';
import {
  BEHAVIOUR, CARD, CHILD, HIT_RESULTS, STAGE, TRANSITION_CASES, caseOptions, shapeCase, type CaseOption, type HitTarget, type ShapeCase, type TransitionCase,
} from './transform-data';

/**
 * CSS transforms (`docs/tracks/transforms.md`). One page, one case at a time, chosen by `setTransformCase` so the
 * verifier can step through them: the shape cases (a card under every kind of transform, compared pixel by pixel with
 * Chrome's), the transition cases, and the behaviour pages that the input checks drive (a click in a turned frame, a hover
 * that scales, a field in a turned card, selectable text, a drag from a turned source, scrolling inside a rotation, an
 * anchor, clipping, text that is scaled up).
 *
 * A case name is `shape:<name>`, `transition:<name>` or one of `combined`, `loop`, `starting`, `contain`, `edge`, `hit`,
 * `hover`, `utilities`, `input`, `selection`, `drag`, `scroll`, `anchor`, `clip`, `sharp`.
 *
 * The stage is a fixed 520 x 320 canvas of absolutely placed parts, so on a window narrower than that (a phone) it is drawn under
 * `scale(w / 520)` about its top left corner, inside a box of the scaled size; the text under it (the case list, the caption, the
 * results) is laid out at the window's width as a page would, and wraps. At 520 and wider nothing is wrapped or scaled, so the
 * verifier's positions (`BEHAVIOUR`, root-local) are the stage's own.
 */

let currentCase = 'shape:identity';
/** For a transition case: whether the card is at its first list or has been sent to the second. */
let transitionTarget: 'from' | 'to' = 'from';
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function setTransformCase(name: string): void {
  currentCase = name;
  transitionTarget = 'from';
  notify();
}

export function sendTransition(target: 'from' | 'to'): void {
  transitionTarget = target;
  notify();
}

// The Web verifier and the capture script are Node scripts driving Chrome: they switch cases through this, as the native verifier does through the exports.
// `cases` lists every case id in the order the lab's list shows them.
Reflect.set(globalThis, 'godotReactTransformLab', { setCase: setTransformCase, sendTransition, cases: () => CASE_OPTIONS.map(option => option.id) });

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The title and body text of the card, in the Tailwind sizes the reference page uses. */
function CardText() {
  return (
    <>
      <Text className="text-xl text-slate-800">{CARD.title}</Text>
      <Text className="text-sm text-slate-800">{CARD.body}</Text>
    </>
  );
}

function cardStyle(transform: string, origin: string | undefined, squareCorners = false): Style {
  return {
    position: 'absolute', left: CARD.left, top: CARD.top, width: CARD.width, height: CARD.height,
    borderRadius: squareCorners ? 0 : CARD.radius, borderWidth: CARD.border, borderColor: CARD.borderColor, backgroundColor: CARD.fill,
    padding: CARD.padding, transform, ...(origin === undefined ? {} : { transformOrigin: origin }),
  };
}

export type { CaseOption };

/** Every case in the order the list shows them, with the caption that explains it (`transform-data.ts`). */
export const CASE_OPTIONS: readonly CaseOption[] = caseOptions();

/**
 * How much of the stage's width the lab has: the stage is drawn at this scale. It is measured from the lab's own box when the root's
 * size changes, so a lab placed in a narrower area than the window (a sidebar, a code panel) fits that area.
 */
const StageFit = createContext(1);
/** The scale is rounded down to this many steps so that a scaled stage never reaches past the box it is drawn in. */
const FIT_STEPS = 10_000;

interface StageProps {
  children: React.ReactNode;
  onClick?: (event: UIPointerEvent) => void;
  onClickCapture?: (event: UIPointerEvent) => void;
}

function Stage({ children, onClick, onClickCapture }: StageProps) {
  const fit = useContext(StageFit);
  const stage = (
    <View
      testID="transform-stage" className="shrink-0" onClick={onClick} onClickCapture={onClickCapture}
      style={{
        width: STAGE.width, height: STAGE.height, backgroundColor: STAGE.background,
        ...(fit === 1 ? {} : { transform: `scale(${fit})`, transformOrigin: 'top left' }),
      }}
    >
      {children}
    </View>
  );
  if (fit === 1) return stage;
  // Layout ignores a transform, so the box the scaled stage is drawn in has the scaled size, and clips what layout still gives the stage's 520 px
  // (the stage does not shrink to the box: it is a fixed canvas, drawn smaller by the scale).
  return <View className="overflow-hidden" style={{ width: STAGE.width * fit, height: STAGE.height * fit }}>{stage}</View>;
}

/** The case list, the Flip button of a transition and the caption of the case, under the stage, as wide as the lab. */
function TransformControls({ name }: { name: string }) {
  const current = CASE_OPTIONS.find(option => option.id === name);
  const isTransition = name.startsWith('transition:');
  return (
    <>
      <View className="h-px shrink-0 bg-slate-200" />
      <View className="gap-2 bg-white px-3 py-2">
        <View className="flex-row items-center gap-2">
          <Select.Root value={name} onValueChange={setTransformCase}>
            <Select.Trigger testID="transform-case-select" aria-label="Transform case" className="min-w-0 flex-1">
              <Select.Value />
              <Select.Icon />
            </Select.Trigger>
            <Select.Content testID="transform-case-list">
              {CASE_OPTIONS.map(option => (
                <Select.Item key={option.id} value={option.id} testID={`transform-case-${option.id}`}>
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          {isTransition ? (
            <Button
              testID="transform-flip"
              onClick={() => sendTransition(transitionTarget === 'from' ? 'to' : 'from')}
              className="rounded-md bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-2.5 py-1"
            >
              <Text className="text-xs font-medium text-white">Flip</Text>
            </Button>
          ) : null}
        </View>
        <Text testID="transform-caption" className="text-sm text-slate-600">
          {current?.caption ?? name}
        </Text>
      </View>
    </>
  );
}

function ShapeCard({ spec }: { spec: ShapeCase }) {
  return (
    <Stage>
      <View testID="transform-card" style={cardStyle(spec.transform, spec.origin, spec.squareCorners === true)}>
        <CardText />
        {spec.child === undefined ? null : (
          <View
            testID="transform-child"
            style={{
              position: 'absolute', left: CHILD.left, top: CHILD.top, width: CHILD.width, height: CHILD.height,
              borderRadius: CHILD.radius, borderWidth: CHILD.border, borderColor: CHILD.borderColor,
              backgroundColor: CHILD.fill, transform: spec.child.transform,
              ...(spec.child.origin === undefined ? {} : { transformOrigin: spec.child.origin }),
            }}
          />
        )}
      </View>
    </Stage>
  );
}

function TransitionCard({ spec }: { spec: TransitionCase }) {
  useSyncExternalStore(subscribe, () => transitionTarget);
  return (
    <Stage>
      <View
        testID="transform-card"
        style={{
          ...cardStyle(transitionTarget === 'from' ? spec.from : spec.to, undefined),
          transition: { properties: ['transform'], durationMs: spec.durationMs, easing: 'linear' },
        }}
      >
        <CardText />
      </View>
    </Stage>
  );
}

/** How long the part a tap landed on stays outlined. */
export const HIT_FLASH_MS = 900;
const HIT_FLASH: Style = { outlineStyle: 'solid', outlineWidth: 3, outlineColor: '#f59e0b', outlineOffset: 2 };
/** The thin outline that marks where a box sits before its transform, drawn over the stage and never hit. */
const HIT_GUIDE: Style = { position: 'absolute', borderWidth: 1, borderColor: '#94a3b8', pointerEvents: 'none' };
const HIT_GUIDE_LABEL = 'absolute text-[10px] text-slate-500 pointer-events-none';

type HitCounts = Readonly<Record<HitTarget, number>>;
type HitFlash = Readonly<Partial<Record<HitTarget, true>>>;
const NO_HITS: HitCounts = { bar: 0, child: 0, parent: 0, collapsed: 0, empty: 0 };
const NO_FLASH: HitFlash = {};

/**
 * A tap in a turned frame, and a child in a scaled parent. Each tap is counted for the parts it hit and those parts are outlined
 * for `HIT_FLASH_MS`: the click's capture phase (first, outermost) clears the last tap's outline and starts the one timer that
 * clears this one, then each handler on the way up (the target, then the elements it is in) adds its part.
 */
function HitPage() {
  const [counts, setCounts] = useState<HitCounts>(NO_HITS);
  const [flash, setFlash] = useState<HitFlash>(NO_FLASH);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const startTap = () => {
    clearTimeout(timer.current);
    setFlash(NO_FLASH);
    timer.current = setTimeout(() => setFlash(NO_FLASH), HIT_FLASH_MS);
  };
  const hit = (target: HitTarget) => () => {
    setCounts(current => ({ ...current, [target]: current[target] + 1 }));
    setFlash(current => ({ ...current, [target]: true }));
  };
  const { bar, hitParent, hitChild, hitCollapsed } = BEHAVIOUR;
  const outlined = (target: HitTarget): Style => (flash[target] === true ? HIT_FLASH : {});
  return (
    <>
      <Stage
        onClickCapture={startTap}
        // The stage is under every part, so a tap reaches it from them too: only one that landed on the bare stage is a miss.
        onClick={event => { if (event.target.id === event.currentTarget.id) hit('empty')(); }}
      >
        <Button
          testID="hit-bar" onClick={hit('bar')} className="items-center justify-center"
          style={{
            position: 'absolute', left: bar.left, top: bar.top, width: bar.width, height: bar.height,
            backgroundColor: '#4f46e5', borderRadius: 8, transform: bar.transform, ...outlined('bar'),
          }}
        >
          <Text className="pointer-events-none text-sm text-white">Turned bar</Text>
        </Button>
        <View
          testID="hit-parent" onClick={hit('parent')}
          style={{
            position: 'absolute', left: hitParent.left, top: hitParent.top, width: hitParent.size, height: hitParent.size,
            backgroundColor: '#fde68a', transform: hitParent.transform, ...outlined('parent'),
          }}
        >
          <View
            testID="hit-child" onClick={hit('child')}
            style={{
              position: 'absolute', left: hitChild.left, top: hitChild.top, width: hitChild.width, height: hitChild.height,
              backgroundColor: '#be123c', transform: hitChild.transform, ...outlined('child'),
            }}
          />
        </View>
        <View
          testID="hit-collapsed" onClick={hit('collapsed')}
          style={{
            position: 'absolute', left: hitCollapsed.left, top: hitCollapsed.top, width: hitCollapsed.size, height: hitCollapsed.size,
            backgroundColor: '#0f172a', transform: hitCollapsed.transform,
          }}
        />
        {/* Where the turned and the scaled boxes sit before their transforms (the box scaled to zero is where it is drawn: nowhere). */}
        <View style={{ ...HIT_GUIDE, left: bar.left, top: bar.top, width: bar.width, height: bar.height }} />
        <Text className={HIT_GUIDE_LABEL} style={{ left: bar.left, top: bar.top + bar.height + 2 }}>unturned box</Text>
        <View style={{ ...HIT_GUIDE, left: hitParent.left, top: hitParent.top, width: hitParent.size, height: hitParent.size }} />
        <Text className={HIT_GUIDE_LABEL} style={{ left: hitParent.left, top: hitParent.top + hitParent.size - 14 }}>unscaled box</Text>
        <View style={{ ...HIT_GUIDE, left: hitCollapsed.left, top: hitCollapsed.top, width: hitCollapsed.size, height: hitCollapsed.size }} />
        <Text className={HIT_GUIDE_LABEL} style={{ left: hitCollapsed.left, top: hitCollapsed.top + hitCollapsed.size + 2 }}>scaled to zero</Text>
      </Stage>
      <View testID="hit-counts" className="flex-row flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-200 bg-white px-3 py-2">
        <Text className="text-xs text-slate-500">Taps counted</Text>
        {HIT_RESULTS.map(({ target, label, colour }) => (
          <View
            key={target}
            className={`flex-row items-center gap-1.5 rounded-md border px-2 py-1 ${flash[target] === true ? 'border-amber-400 bg-amber-100' : 'border-slate-200 bg-slate-50'}`}
          >
            <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colour }} />
            <Text className="text-xs text-slate-600">{label}</Text>
            <Text testID={`hit-count-${target}`} className="text-xs font-medium text-slate-900">{String(counts[target])}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

/** A rounded box, a square-cornered one and a thin outline squeezed on one axis, and a square turned, for the antialiasing of their straight edges. */
function EdgePage() {
  const { edge } = BEHAVIOUR;
  return (
    <Stage>
      <View
        testID="edge-box"
        style={{
          position: 'absolute', left: edge.left, top: edge.top, width: edge.width, height: edge.height,
          borderRadius: 8, backgroundColor: '#b45309', transform: edge.transform, transformOrigin: 'top',
        }}
      />
      <View
        testID="edge-flat"
        style={{
          position: 'absolute', left: BEHAVIOUR.edgeFlat.left, top: BEHAVIOUR.edgeFlat.top, width: BEHAVIOUR.edgeFlat.width, height: BEHAVIOUR.edgeFlat.height,
          backgroundColor: '#b45309', transform: BEHAVIOUR.edgeFlat.transform, transformOrigin: 'top',
        }}
      />
      <View
        testID="edge-ring"
        style={{
          position: 'absolute', left: BEHAVIOUR.edgeRing.left, top: BEHAVIOUR.edgeRing.top, width: BEHAVIOUR.edgeRing.width, height: BEHAVIOUR.edgeRing.height,
          borderRadius: BEHAVIOUR.edgeRing.radius, borderWidth: BEHAVIOUR.edgeRing.border, borderColor: '#b45309',
          transform: BEHAVIOUR.edgeRing.transform, transformOrigin: 'top',
        }}
      />
      <View
        testID="edge-gradient"
        className="bg-gradient-to-r from-indigo-500 to-indigo-500"
        style={{
          position: 'absolute', left: BEHAVIOUR.turnedGradient.left, top: BEHAVIOUR.turnedGradient.top,
          width: BEHAVIOUR.turnedGradient.size, height: BEHAVIOUR.turnedGradient.size, transform: BEHAVIOUR.turnedGradient.transform,
        }}
      />
      <View
        testID="edge-gradient-ring"
        className="bg-gradient-to-r from-indigo-500 to-indigo-500 border-indigo-500"
        style={{
          position: 'absolute', left: BEHAVIOUR.turnedGradientRing.left, top: BEHAVIOUR.turnedGradientRing.top,
          width: BEHAVIOUR.turnedGradientRing.size, height: BEHAVIOUR.turnedGradientRing.size, borderWidth: BEHAVIOUR.turnedGradientRing.border,
          borderRadius: BEHAVIOUR.turnedGradientRing.radius, transform: BEHAVIOUR.turnedGradientRing.transform,
        }}
      />
      <View
        testID="edge-square"
        style={{
          position: 'absolute', left: BEHAVIOUR.turnedSquare.left, top: BEHAVIOUR.turnedSquare.top,
          width: BEHAVIOUR.turnedSquare.size, height: BEHAVIOUR.turnedSquare.size,
          backgroundColor: '#b45309', transform: BEHAVIOUR.turnedSquare.transform,
        }}
      />
    </Stage>
  );
}

/** A static element under a translate: the containing block of an absolute child and of a fixed one. */
function ContainPage() {
  const { contain } = BEHAVIOUR;
  return (
    <Stage>
      <View
        testID="contain-parent"
        style={{
          // Static, placed by margins: it is the containing block of what is below it only because it is transformed.
          marginLeft: contain.left, marginTop: contain.top, width: contain.width, height: contain.height,
          backgroundColor: '#e0e7ff', transform: contain.transform,
        }}
      >
        <View
          testID="contain-absolute"
          style={{ position: 'absolute', left: contain.absolute.left, top: contain.absolute.top, width: contain.absolute.size, height: contain.absolute.size, backgroundColor: '#be123c' }}
        />
        <View
          testID="contain-fixed"
          style={{ position: 'fixed', left: contain.fixed.left, top: contain.fixed.top, width: contain.fixed.size, height: contain.fixed.size, backgroundColor: '#047857' }}
        />
      </View>
    </Stage>
  );
}

/** A card that grows on hover: the pointer stays on it past its layout box because the hit region grew with it. */
function HoverPage() {
  const { hover } = BEHAVIOUR;
  return (
    <Stage>
      <View
        testID="hover-card"
        className="hover:scale-125 active:scale-125 items-center justify-center"
        style={{
          position: 'absolute', left: hover.left, top: hover.top, width: hover.width, height: hover.height,
          backgroundColor: '#e0e7ff', borderRadius: 12, borderWidth: 2, borderColor: '#6366f1',
          transition: { properties: ['transform'], durationMs: 0 },
        }}
      >
        <Text className="pointer-events-none text-sm text-slate-800">Hover me</Text>
      </View>
    </Stage>
  );
}

/** Tailwind utilities that compose: the translate is kept when the hover scale applies. */
function UtilitiesPage() {
  return (
    <Stage>
      <View
        testID="utility-card"
        className="-translate-x-1/2 -translate-y-1/4 rotate-6 hover:scale-110 active:scale-110 origin-top-left items-center justify-center"
        style={{
          position: 'absolute', left: 260, top: 140, width: 120, height: 60, backgroundColor: '#fecdd3',
          borderRadius: 8, transition: { properties: ['transform'], durationMs: 0 },
        }}
      >
        <Text className="pointer-events-none text-sm text-slate-800">Utilities</Text>
      </View>
    </Stage>
  );
}

/** A field in a turned, scaled card. */
function InputPage() {
  const { input } = BEHAVIOUR;
  return (
    <Stage>
      <View
        testID="input-card"
        style={{
          position: 'absolute', left: input.left, top: input.top, width: input.width, height: input.height,
          backgroundColor: '#ecfeff', borderRadius: 12, borderWidth: 2, borderColor: '#0891b2', padding: 12,
          transform: input.transform,
        }}
      >
        <Text className="text-xs text-slate-600">A field in a turned card</Text>
        <TextInput
          testID="input-field" defaultValue="Hamburgefonstiv"
          className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-base text-slate-900 caret-indigo-600"
        />
      </View>
    </Stage>
  );
}

/** Selectable text in a turned frame. */
function SelectionPage() {
  const { selectable } = BEHAVIOUR;
  return (
    <Stage>
      <View
        testID="selection-card"
        className="select-text"
        style={{
          position: 'absolute', left: selectable.left, top: selectable.top, width: selectable.width,
          backgroundColor: '#f1f5f9', borderRadius: 8, padding: 10, transform: selectable.transform,
        }}
      >
        <Text testID="selection-text" className="whitespace-nowrap text-base text-slate-900">Hamburgefonstiv in a turned frame</Text>
      </View>
    </Stage>
  );
}

/** A draggable turned card and its target. */
function DragPage() {
  const { drag } = BEHAVIOUR;
  const [dropped, setDropped] = useState('none');
  return (
    <Stage>
      <View
        testID="drag-source" draggable className="items-center justify-center"
        onDragStart={(event: UIDragEvent<'dragstart'>) => { event.dataTransfer.setData('text/plain', 'card'); event.dataTransfer.effectAllowed = 'move'; }}
        style={{
          position: 'absolute', left: drag.left, top: drag.top, width: drag.width, height: drag.height,
          backgroundColor: '#fde68a', borderRadius: 10, borderWidth: 2, borderColor: '#b45309', transform: drag.transform,
        }}
      >
        <Text className="text-sm text-slate-800">Drag me</Text>
      </View>
      <View
        testID="drag-target" className="items-center justify-center"
        onDragOver={(event: UIDragEvent<'dragover'>) => { event.dataTransfer.dropEffect = 'move'; event.preventDefault(); }}
        onDrop={(event: UIDragEvent<'drop'>) => { event.preventDefault(); setDropped(event.dataTransfer.getData('text/plain')); }}
        style={{
          position: 'absolute', left: drag.targetLeft, top: drag.targetTop, width: drag.targetSize, height: drag.targetSize,
          backgroundColor: '#dcfce7', borderRadius: 12, transform: 'rotate(-12deg)',
        }}
      >
        <Text testID="drag-dropped" className="text-sm text-slate-800">{dropped}</Text>
      </View>
    </Stage>
  );
}

/** Two scrollers under a rotation: a vertical list tilted a little, and a row turned a quarter. */
function ScrollPage() {
  const { tilted, quarter } = BEHAVIOUR;
  return (
    <Stage>
      <ScrollView
        testID="scroll-tilted"
        style={{
          position: 'absolute', left: tilted.left, top: tilted.top, width: tilted.width, height: tilted.height,
          backgroundColor: '#f1f5f9', borderRadius: 8, transform: tilted.transform,
        }}
      >
        {Array.from({ length: tilted.rows }, (_, index) => (
          <View key={index} testID={`tilted-row-${index}`} style={{ height: tilted.rowHeight, justifyContent: 'center', paddingLeft: 8 }}>
            <Text className="text-sm text-slate-800">{`Row ${index}`}</Text>
          </View>
        ))}
      </ScrollView>
      <ScrollView
        testID="scroll-quarter" horizontal
        style={{
          position: 'absolute', left: quarter.left, top: quarter.top, width: quarter.width, height: quarter.height,
          backgroundColor: '#fef3c7', borderRadius: 8, transform: quarter.transform,
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          {Array.from({ length: quarter.cells }, (_, index) => (
            <View key={index} testID={`quarter-cell-${index}`} style={{ width: quarter.cellWidth, height: quarter.height, justifyContent: 'center', alignItems: 'center' }}>
              <Text className="text-sm text-slate-800">{`${index}`}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Stage>
  );
}

/**
 * A turned trigger, and a marker placed from its `getRect()` at the bottom right of the box round it, as a popover is: through a
 * `Portal`, because `getRect()` is root-local, and only the overlay layer's frame is the root's wherever the lab is shown.
 */
function AnchorPage() {
  const { anchor: spec } = BEHAVIOUR;
  const trigger = useRef<UIHandle>(null);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | undefined>(undefined);
  useLayoutEffect(() => {
    const rect = trigger.current?.getRect();
    if (rect !== undefined) setBox({ left: rect.x, top: rect.y, width: rect.width, height: rect.height });
  }, []);
  return (
    <Stage>
      <View
        ref={trigger} testID="anchor-trigger"
        style={{
          position: 'absolute', left: spec.left, top: spec.top, width: spec.width, height: spec.height,
          backgroundColor: '#c7d2fe', borderRadius: 8, transform: spec.transform,
        }}
      />
      {box === undefined ? null : (
        <Portal>
          {/* Subtle bounding-box guide so the marker's anchor position at the corner is visually clear. */}
          <View
            testID="anchor-bounding-box"
            style={{
              position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height,
              borderWidth: 1, borderColor: '#a5b4fc', pointerEvents: 'none',
            }}
          />
          <View testID="anchor-marker" style={{ position: 'absolute', left: box.left + box.width, top: box.top + box.height, width: 8, height: 8, backgroundColor: '#be123c' }} />
        </Portal>
      )}
    </Stage>
  );
}

/** The same clipped box under a scale and under a rotation. */
function ClipPage() {
  const { clipped } = BEHAVIOUR;
  const box = (testID: string, left: number, transform: string): React.ReactNode => (
    <View
      testID={testID} className="overflow-hidden"
      style={{ position: 'absolute', left, top: clipped.top, width: clipped.size, height: clipped.size, backgroundColor: '#e2e8f0', transform }}
    >
      <View testID={`${testID}-child`} style={{ position: 'absolute', left: 60, top: 60, width: clipped.size, height: clipped.size, backgroundColor: '#be123c' }} />
    </View>
  );
  return (
    <Stage>
      {box('clip-scaled', clipped.left, clipped.scale)}
      {box('clip-rotated', clipped.left + clipped.gap, clipped.rotate)}
    </Stage>
  );
}

/** Text under scale-150, and the same text unscaled to compare with. */
function SharpPage() {
  return (
    <Stage>
      <View testID="sharp-scaled" style={{ position: 'absolute', left: 60, top: 100, transform: 'scale(1.5)', transformOrigin: 'top left' }}>
        <Text testID="sharp-scaled-text" className="text-base text-slate-900">Hamburgefonstiv 0123</Text>
      </View>
      <View testID="sharp-plain" style={{ position: 'absolute', left: 60, top: 200 }}>
        <Text testID="sharp-plain-text" className="text-2xl text-slate-900">Hamburgefonstiv 0123</Text>
      </View>
    </Stage>
  );
}

const COMBINED_DURATION_MS = 400;

/** Simultaneous transitions of transform, opacity, backgroundColor and height, plus hover/active utility composition. */
function CombinedPage() {
  const [expanded, setExpanded] = useState(false);
  return (
    <Stage>
      <View
        testID="combined-card"
        style={{
          position: 'absolute', left: 60, top: 70, width: 190,
          height: expanded ? 124 : 88,
          opacity: expanded ? 0.45 : 1,
          backgroundColor: expanded ? '#db2777' : '#4f46e5',
          borderRadius: 14, padding: 12,
          transform: expanded ? 'translate(72px, -12px) rotate(12deg) scale(1.15)' : 'translate(0px, 0px) rotate(0deg) scale(1)',
          transition: {
            properties: ['transform', 'opacity', 'backgroundColor', 'height'],
            durationMs: COMBINED_DURATION_MS,
            easing: 'linear',
          },
        }}
      >
        <Text className="text-base text-white">Combined</Text>
        <Text testID="combined-state" className="text-xs text-indigo-100">{expanded ? 'expanded' : 'rest'}</Text>
      </View>
      <Button
        testID="combined-toggle"
        onClick={() => setExpanded(current => !current)}
        className="rounded-md bg-slate-900 hover:bg-slate-700 active:bg-slate-800 px-3 py-1.5"
        style={{ position: 'absolute', left: 60, top: 240 }}
      >
        <Text className="text-xs text-white">Toggle combined transition</Text>
      </Button>
      <Button
        testID="combined-hover-pill"
        className="rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 hover:scale-110 hover:-translate-y-1 active:scale-95 px-4 py-2"
        style={{
          position: 'absolute', left: 320, top: 236,
          transition: { properties: ['transform', 'backgroundColor'], durationMs: 250, easing: 'ease-out' },
        }}
      >
        <Text className="text-xs text-white">Hover & press me</Text>
      </Button>
    </Stage>
  );
}

const LOOP_STEP_MS = 280;
interface LoopFrame { readonly transform: string; readonly bg: `#${string}`; readonly opacity: number }
const LOOP_KEYFRAMES: readonly [LoopFrame, ...LoopFrame[]] = [
  { transform: 'translate(0px, 0px) rotate(0deg) scale(1)', bg: '#4f46e5', opacity: 1 },
  { transform: 'translate(64px, -18px) rotate(45deg) scale(1.2)', bg: '#0891b2', opacity: 0.75 },
  { transform: 'translate(128px, 0px) rotate(90deg) scale(0.9)', bg: '#db2777', opacity: 0.5 },
  { transform: 'translate(64px, 18px) rotate(45deg) scale(1.1)', bg: '#d97706', opacity: 0.85 },
];

/** A continuous multi-step looping transform + colour animation. */
function LoopPage() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    if (!running) return undefined;
    const kick = setTimeout(() => setStep(current => (current + 1) % LOOP_KEYFRAMES.length), 20);
    const timer = setInterval(() => {
      setStep(current => (current + 1) % LOOP_KEYFRAMES.length);
    }, LOOP_STEP_MS);
    return () => {
      clearTimeout(kick);
      clearInterval(timer);
    };
  }, [running]);
  const frame = LOOP_KEYFRAMES[step] ?? LOOP_KEYFRAMES[0];
  return (
    <Stage>
      <View
        testID="loop-card"
        style={{
          position: 'absolute', left: 130, top: 96, width: 140, height: 96,
          borderRadius: 16, padding: 12,
          backgroundColor: frame.bg,
          opacity: frame.opacity,
          transform: frame.transform,
          transition: { properties: ['transform', 'backgroundColor', 'opacity'], durationMs: LOOP_STEP_MS, easing: 'linear' },
        }}
      >
        <Text className="text-base text-white">Looping</Text>
        <Text testID="loop-step-label" className="text-xs text-white">{`step ${step}`}</Text>
      </View>
      <View style={{ position: 'absolute', left: 60, top: 248 }} className="flex-row items-center gap-2">
        <Button
          testID="loop-toggle"
          onClick={() => setRunning(current => !current)}
          className="rounded-md bg-slate-900 hover:bg-slate-700 px-3 py-1.5"
        >
          <Text className="text-xs text-white">{running ? 'Pause loop' : 'Resume loop'}</Text>
        </Button>
        <Button
          testID="loop-step"
          onClick={() => setStep(current => (current + 1) % LOOP_KEYFRAMES.length)}
          className="rounded-md bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5"
        >
          <Text className="text-xs text-white">Next keyframe</Text>
        </Button>
      </View>
    </Stage>
  );
}

const STARTING_DURATION_MS = 400;

/** Tailwind `starting:` (`@starting-style`) transitions on initial mount and when shown from `display: none`. */
function StartingPage() {
  const [mountKey, setMountKey] = useState(0);
  const [shown, setShown] = useState(true);
  return (
    <Stage>
      <View
        key={mountKey}
        testID="starting-card"
        className="opacity-100 translate-y-0 rotate-0 scale-100 bg-indigo-600 starting:opacity-0 starting:translate-y-8 starting:-rotate-12 starting:scale-50 starting:bg-amber-400"
        style={{
          position: 'absolute', left: 50, top: 76, width: 200, height: 110,
          borderRadius: 16, padding: 12,
          transition: { properties: ['transform', 'opacity', 'backgroundColor'], durationMs: STARTING_DURATION_MS, easing: 'linear' },
        }}
      >
        <Text className="text-base text-white">@starting-style</Text>
        <Text testID="starting-mount-count" className="text-xs text-indigo-100">{`mount ${mountKey}`}</Text>
      </View>
      <View
        testID="starting-display-card"
        className={`${shown ? 'flex' : 'hidden'} opacity-100 scale-100 translate-x-0 bg-emerald-600 starting:opacity-0 starting:scale-50 starting:translate-x-6`}
        style={{
          position: 'absolute', left: 290, top: 76, width: 180, height: 110,
          borderRadius: 16, padding: 12,
          transition: { properties: ['transform', 'opacity'], durationMs: STARTING_DURATION_MS, easing: 'linear' },
        }}
      >
        <Text className="text-base text-white">From hidden</Text>
        <Text className="text-xs text-emerald-100">display: none -&gt; flex</Text>
      </View>
      <View style={{ position: 'absolute', left: 50, top: 244 }} className="flex-row items-center gap-2">
        <Button
          testID="starting-remount"
          onClick={() => setMountKey(current => current + 1)}
          className="rounded-md bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5"
        >
          <Text className="text-xs text-white">Remount card</Text>
        </Button>
        <Button
          testID="starting-display-toggle"
          onClick={() => setShown(current => !current)}
          className="rounded-md bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5"
        >
          <Text className="text-xs text-white">{shown ? 'Hide second card' : 'Show second card'}</Text>
        </Button>
      </View>
    </Stage>
  );
}

function ActiveCasePage({ name }: { name: string }) {
  if (name.startsWith('shape:')) return <ShapeCard spec={shapeCase(name.slice('shape:'.length))} />;
  if (name.startsWith('transition:')) {
    const wanted = name.slice('transition:'.length);
    const spec = TRANSITION_CASES.find(candidate => candidate.name === wanted);
    if (spec === undefined) throw new Error(`No transition case named ${wanted}`);
    return <TransitionCard key={spec.name} spec={spec} />;
  }
  switch (name) {
    case 'combined': return <CombinedPage />;
    case 'loop': return <LoopPage />;
    case 'starting': return <StartingPage />;
    case 'contain': return <ContainPage />;
    case 'edge': return <EdgePage />;
    case 'hit': return <HitPage />;
    case 'hover': return <HoverPage />;
    case 'utilities': return <UtilitiesPage />;
    case 'input': return <InputPage />;
    case 'selection': return <SelectionPage />;
    case 'drag': return <DragPage />;
    case 'scroll': return <ScrollPage />;
    case 'anchor': return <AnchorPage />;
    case 'clip': return <ClipPage />;
    case 'sharp': return <SharpPage />;
    default: throw new Error(`No transform lab case named ${name}`);
  }
}

export function TransformLab() {
  const name = useSyncExternalStore(subscribe, () => currentCase);
  const { width: rootWidth } = useRootSize();
  const box = useRef<UIHandle>(null);
  const [width, setWidth] = useState<number>(STAGE.width);
  // The lab is as wide as its area up to the stage's own width: measure it when the root's size changes (the layout is already done).
  useLayoutEffect(() => {
    const rect = box.current?.getRect();
    if (rect !== undefined) setWidth(rect.width);
  }, [rootWidth]);
  const fit = Math.min(1, Math.floor(width / STAGE.width * FIT_STEPS) / FIT_STEPS);
  return (
    <View ref={box} testID="transform-lab" className="w-full" style={{ maxWidth: STAGE.width }}>
      <StageFit.Provider value={fit}>
        <ActiveCasePage name={name} />
      </StageFit.Provider>
      <TransformControls name={name} />
    </View>
  );
}
