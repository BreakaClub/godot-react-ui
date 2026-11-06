import { useRef, useState, type ReactNode } from 'react';
import { Button, ScrollView, Text, View, type UIHandle, type UIPointerEvent, type UIScrollEvent, type UIWheelEvent } from 'godot-react-ui';

/** Rows in the lists, and how many of the nested lists' rows sit below the inner list. */
const LIST_ROWS = 30;
/** The list shrinks to this many rows when its content shrinks, to show the offset being re-clamped. */
const SHORT_LIST_ROWS = 8;
/** The row `Reveal` scrolls into view: well below the first screenful. */
const REVEAL_ROW = 24;
const QUIET_ROWS = 24;
const CAROUSEL_CARDS = 14;
const INNER_ROWS = 16;
const FILLER_ROWS = 10;
const TOUCH_ROWS = 30;
const REVERSED_ROWS = 10;
const CAPTURE_ROWS = 14;

const row = 'h-9 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-indigo-50 active:bg-indigo-100 focus:border-indigo-500';
const plainRow = 'h-9 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700';
const box = 'h-36 w-full rounded-xl border border-slate-200 bg-white';
const labButton = 'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="w-44 gap-1">
      <Text className="text-xs text-slate-500">{title}</Text>
      {children}
    </View>
  );
}

function indexes(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

/** A tall list of buttons. `onScroll` puts where it is in a readout; rows have hover styles and take clicks. */
function ListSection() {
  const [top, setTop] = useState(0);
  const [clicked, setClicked] = useState('none');
  const [wrapClicks, setWrapClicks] = useState(0);
  const [short, setShort] = useState(false);
  const list = useRef<UIHandle>(null);
  const reveal = useRef<UIHandle>(null);
  return (
    <Section title="Vertical list">
      <View testID="list-wrap" onClick={() => setWrapClicks(current => current + 1)}>
        <ScrollView ref={list} testID="scroll-list" className={box} contentClassName="gap-1 p-2" onScroll={(event: UIScrollEvent) => setTop(Math.round(event.scrollTop))}>
          {indexes(short ? SHORT_LIST_ROWS : LIST_ROWS).map(index => (
            <Button key={index} ref={index === REVEAL_ROW ? reveal : undefined} testID={`list-row-${index}`} className={row} onClick={() => setClicked(`row ${index}`)}>{`Row ${index}`}</Button>
          ))}
        </ScrollView>
      </View>
      <View className="flex-row flex-wrap gap-1">
        <Button testID="list-reveal" className={labButton} onClick={() => reveal.current?.scrollIntoView()}>Reveal 24</Button>
        <Button testID="list-top" className={labButton} onClick={() => list.current?.scrollTo({ top: 0 })}>To top</Button>
        <Button testID="list-shrink" className={labButton} onClick={() => setShort(current => !current)}>{short ? 'Grow' : 'Shrink'}</Button>
      </View>
      <Text testID="list-status" className="text-xs text-slate-600">{`top ${top}, clicked ${clicked}, wrap clicks ${wrapClicks}`}</Text>
    </Section>
  );
}

/** No handlers, no hover styles, no state: nothing React does while it scrolls. */
function QuietSection() {
  return (
    <Section title="Quiet list">
      <ScrollView testID="quiet-list" className={box} contentClassName="gap-1 p-2">
        {indexes(QUIET_ROWS).map(index => (
          <View key={index} testID={`quiet-row-${index}`} className="h-9 shrink-0 justify-center rounded-lg bg-amber-100 px-3"><Text className="text-sm text-amber-800">{`Quiet ${index}`}</Text></View>
        ))}
      </ScrollView>
    </Section>
  );
}

function CarouselSection() {
  const [left, setLeft] = useState(0);
  return (
    <Section title="Carousel, no scrollbar">
      <ScrollView
        testID="carousel"
        horizontal
        className="h-24 w-full scrollbar-none rounded-xl border border-slate-200 bg-white"
        contentClassName="gap-2 p-2"
        onScroll={(event: UIScrollEvent) => setLeft(Math.round(event.scrollLeft))}
        onWheelCapture={(event: UIWheelEvent) => { if (event.ctrlKey) event.preventDefault(); }}
      >
        {indexes(CAROUSEL_CARDS).map(index => (
          <View key={index} testID={`card-${index}`} className="h-full w-20 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
            <Text className="text-sm text-indigo-700">{`Card ${index}`}</Text>
          </View>
        ))}
      </ScrollView>
      <Text testID="carousel-status" className="text-xs text-slate-600">{`left ${left}`}</Text>
    </Section>
  );
}

/** A list inside a list: a scroll the inner one cannot take goes to the outer one, or stops at `contain`. */
function NestedSection({ contain }: { contain: boolean }) {
  const name = contain ? 'contain' : 'chain';
  const [inner, setInner] = useState(0);
  const [outer, setOuter] = useState(0);
  return (
    <Section title={contain ? 'Nested, overscroll-contain' : 'Nested, chaining'}>
      <ScrollView testID={`${name}-outer`} className={box} focusable={false} contentClassName="gap-1 p-2" onScroll={(event: UIScrollEvent) => setOuter(Math.round(event.scrollTop))}>
        <Text className="text-xs text-slate-500">Outer header</Text>
        <ScrollView testID={`${name}-inner`} className={`h-20 shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 ${contain ? 'overscroll-contain' : ''}`} focusable={false} contentClassName="gap-1 p-1" onScroll={(event: UIScrollEvent) => setInner(Math.round(event.scrollTop))}>
          {indexes(INNER_ROWS).map(index => (
            <View key={index} className="h-6 shrink-0 justify-center rounded bg-white px-2"><Text className="text-xs text-slate-700">{`Inner ${index}`}</Text></View>
          ))}
        </ScrollView>
        {indexes(FILLER_ROWS).map(index => (
          <View key={index} className={`${plainRow} justify-center`}><Text className="text-sm text-slate-700">{`Outer ${index}`}</Text></View>
        ))}
      </ScrollView>
      <Text testID={`${name}-status`} className="text-xs text-slate-600">{`inner ${inner}, outer ${outer}`}</Text>
    </Section>
  );
}

/**
 * A touch that starts on the `touch-none` pad stays pointer events; anywhere else it pans the list. Every row is a
 * button and the rows touch each other, so a finger anywhere in the list is on one.
 */
function TouchSection() {
  const [pad, setPad] = useState({ down: 0, moves: 0, cancels: 0 });
  const [clicks, setClicks] = useState(0);
  const [bars, setBars] = useState(true);
  const [vanished, setVanished] = useState(false);
  const list = useRef<UIHandle>(null);
  return (
    <Section title="Touch list">
      <ScrollView ref={list} testID="touch-list" className={`${box} ${bars ? 'scrollbar-[#e11d48]' : 'scrollbar-none'}`} focusable={false} contentClassName="p-2">
        <View
          testID="touch-pad"
          className="h-12 shrink-0 touch-none justify-center rounded-lg bg-amber-100 px-3"
          onPointerDown={(_: UIPointerEvent) => setPad(current => ({ ...current, down: current.down + 1 }))}
          onPointerMove={(_: UIPointerEvent) => setPad(current => ({ ...current, moves: current.moves + 1 }))}
          onPointerCancel={(_: UIPointerEvent) => setPad(current => ({ ...current, cancels: current.cancels + 1 }))}
        >
          <Text className="text-sm text-amber-800">touch-none pad</Text>
        </View>
        {indexes(TOUCH_ROWS).map(index => (
          <Button key={index} testID={`touch-row-${index}`} className={row} onClick={() => setClicks(current => current + 1)}>{`Touch ${index}`}</Button>
        ))}
      </ScrollView>
      <View className="flex-row gap-1">
        <Button testID="touch-top" className={labButton} onClick={() => list.current?.scrollTo({ top: 0 })}>Top</Button>
        <Button testID="touch-bars" className={labButton} onClick={() => setBars(current => !current)}>{bars ? 'Hide bar' : 'Show bar'}</Button>
        {!vanished && <Button testID="touch-vanish" className={labButton} onPointerDown={() => setVanished(true)}>Vanish</Button>}
        <Button testID="touch-vanish-restore" className={labButton} onClick={() => setVanished(false)}>Bring back</Button>
      </View>
      <Text testID="touch-status" className="text-xs text-slate-600">{`pad down ${pad.down}, moves ${pad.moves}, cancels ${pad.cancels}, clicks ${clicks}`}</Text>
    </Section>
  );
}

/**
 * A list whose `pointerdown` captures the pointer, on a row or on its scrollbar thumb. JS has taken that pointer, so
 * native neither pans it with a finger nor drags the thumb with the mouse (plan 3.12 rule 1): the list gets the moves.
 */
function CaptureSection() {
  const [seen, setSeen] = useState({ down: 0, moves: 0, cancels: 0 });
  return (
    <Section title="Captured pointer">
      <View
        testID="capture-list"
        className="h-24 w-full flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2"
        onPointerDown={(event: UIPointerEvent) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setSeen(current => ({ ...current, down: current.down + 1 }));
        }}
        onPointerMove={(_: UIPointerEvent) => setSeen(current => ({ ...current, moves: current.moves + 1 }))}
        onPointerCancel={(_: UIPointerEvent) => setSeen(current => ({ ...current, cancels: current.cancels + 1 }))}
      >
        {indexes(CAPTURE_ROWS).map(index => (
          <View key={index} className="h-6 shrink-0 justify-center rounded bg-sky-100 px-2"><Text className="text-xs text-sky-800">{`Captured ${index}`}</Text></View>
        ))}
      </View>
      <Text testID="capture-status" className="text-xs text-slate-600">{`down ${seen.down}, moves ${seen.moves}, cancels ${seen.cancels}`}</Text>
    </Section>
  );
}

/** `column-reverse`: the content starts at the bottom, so the offsets run from minus the overflow to zero. */
function ReversedSection() {
  return (
    <Section title="Reversed list">
      <View testID="rev-list" className="h-24 w-full flex-col-reverse gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
        {indexes(REVERSED_ROWS).map(index => (
          <View key={index} testID={`rev-row-${index}`} className="h-6 shrink-0 justify-center rounded bg-emerald-100 px-2"><Text className="text-xs text-emerald-800">{`Reversed ${index}`}</Text></View>
        ))}
      </View>
    </Section>
  );
}

/** Phase I5: scroll containers. */
export function ScrollLab() {
  return (
    <View testID="scroll-lab" className="w-full min-h-full bg-slate-50 p-4 gap-3">
      <View className="gap-1">
        <Text testID="scroll-title" className="text-2xl text-slate-900">Scrolling</Text>
        <Text className="text-sm text-slate-500">Wheel, trackpad, touch, keys and scrollbars. Shift+wheel scrolls sideways, Ctrl+wheel is prevented on the carousel, and a nested list chains to its outer list unless it is overscroll-contain.</Text>
      </View>
      <View testID="scroll-sections" className="flex-row flex-wrap gap-3">
        <ListSection />
        <QuietSection />
        <CarouselSection />
        <NestedSection contain={false} />
        <NestedSection contain />
        <TouchSection />
        <ReversedSection />
        <CaptureSection />
      </View>
    </View>
  );
}
