import { useEffect, useRef, useState } from 'react';
import { Button, Text, View, type Style, type UIHandle, type UIPointerEvent } from 'godot-react-ui';
import { LAB_CARD_CLASS, LabCase, LabGrid, LabIntro, Readout } from './lab-parts';

/** The pad logs this many of the latest events (moves are counted, not logged). */
const LOG_LINES = 6;
/** The knob's track fills the card up to this width. */
const KNOB_TRACK_MAX_WIDTH = 320;
const KNOB_THUMB_WIDTH = 20;
const PERCENT = 100;
/** How long the pad stays outlined after a press, and the outline and marker colours (amber, as every lab's hits are). */
const HIT_FLASH_MS = 900;
const HIT_COLOUR = '#f59e0b';
const HIT_FLASH: Style = { outlineStyle: 'solid', outlineWidth: 3, outlineColor: HIT_COLOUR, outlineOffset: 2 };
const HIT_MARKER_SIZE = 12;
/** The knob's thumb and the readout that counts it share this colour. */
const KNOB_COLOUR = '#4f46e5';
const PAD_LABEL_ID = 'pad-label';

const labButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';

/** DOM `button` numbers, in order. */
const MOUSE_BUTTON_NAMES: readonly string[] = ['left button', 'middle button', 'right button', 'back button', 'forward button'];

interface Tally {
  /** `pointerdown`s by pointer type. */
  downs: { mouse: number; touch: number };
  /** The `detail` of every `click`, in order. */
  clicks: number[];
  doubleClicks: number;
  auxClicks: number;
  contextMenus: number;
  cancels: number;
  /** The distinct pointer ids that went down. */
  ids: number[];
}

const EMPTY_TALLY: Tally = { downs: { mouse: 0, touch: 0 }, clicks: [], doubleClicks: 0, auxClicks: 0, contextMenus: 0, cancels: 0, ids: [] };

/** What a press, click or menu request reached, and where in the pad (pad-local logical pixels). */
interface Hit {
  readonly event: string;
  readonly by: string;
  readonly on: string;
  readonly x: number;
  readonly y: number;
}

function describe(event: UIPointerEvent): string {
  return `${event.type} ${event.pointerType}#${event.pointerId} b${event.button} bs${event.buttons} d${event.detail}`;
}

function tally(previous: Tally, event: UIPointerEvent): Tally {
  switch (event.type) {
    case 'pointerdown': {
      const type = event.pointerType === 'touch' ? 'touch' : 'mouse';
      return {
        ...previous,
        downs: { ...previous.downs, [type]: previous.downs[type] + 1 },
        ids: previous.ids.includes(event.pointerId) ? previous.ids : [...previous.ids, event.pointerId].sort((a, b) => a - b),
      };
    }
    case 'click': return { ...previous, clicks: [...previous.clicks, event.detail] };
    case 'dblclick': return { ...previous, doubleClicks: previous.doubleClicks + 1 };
    case 'auxclick': return { ...previous, auxClicks: previous.auxClicks + 1 };
    case 'contextmenu': return { ...previous, contextMenus: previous.contextMenus + 1 };
    case 'pointercancel': return { ...previous, cancels: previous.cancels + 1 };
    case 'pointerup': case 'pointermove': case 'pointerenter': case 'pointerleave':
      return previous;
  }
}

function describeTally(value: Tally): string {
  return `down mouse ${value.downs.mouse} touch ${value.downs.touch}, ids ${value.ids.join(',') || 'none'}, clicks ${value.clicks.join(',') || 'none'}, `
    + `dbl ${value.doubleClicks}, aux ${value.auxClicks}, ctx ${value.contextMenus}, cancel ${value.cancels}`;
}

function buttonName(event: UIPointerEvent): string {
  if (event.pointerType === 'touch') return 'a finger';
  return MOUSE_BUTTON_NAMES[event.button] ?? `button ${event.button}`;
}

/** The hit a press-like event makes (the pad's own rectangle places it), or `undefined` for an event that is no hit. */
function hitOf(event: UIPointerEvent): Hit | undefined {
  switch (event.type) {
    case 'pointerdown': case 'click': case 'auxclick': case 'contextmenu': {
      const rect = event.currentTarget.getRect();
      if (rect === undefined) return undefined;
      return {
        event: event.type,
        by: buttonName(event),
        on: event.target.testID === PAD_LABEL_ID ? "the pad's label" : 'the pad itself',
        x: Math.round(event.x - rect.x),
        y: Math.round(event.y - rect.y),
      };
    }
    case 'dblclick': case 'pointerup': case 'pointermove': case 'pointerenter': case 'pointerleave': case 'pointercancel':
      return undefined;
  }
}

/** A named result whose value is a sentence or a line of numbers: the name above, the value under it, wrapping at the card's width. */
function StackedReadout({ label, value, testID, colour }: { label: string; value: string; testID?: string; colour?: `#${string}` }) {
  return (
    <View className="gap-0.5">
      <View className="flex-row items-center gap-x-1.5">
        {colour === undefined ? null : <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colour }} />}
        <Text className="text-xs text-slate-500">{label}</Text>
      </View>
      <Text testID={testID} className="text-xs text-slate-900">{value}</Text>
    </View>
  );
}

function Pad() {
  const [lines, setLines] = useState<string[]>([]);
  const [counts, setCounts] = useState(EMPTY_TALLY);
  const [moves, setMoves] = useState(0);
  const [hit, setHit] = useState<Hit | undefined>(undefined);
  const [flashing, setFlashing] = useState(false);
  // One timer, owned by the pad: the next hit replaces it, and leaving the lab clears it.
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const record = (event: UIPointerEvent) => {
    setLines(current => [...current, describe(event)].slice(-LOG_LINES));
    setCounts(current => tally(current, event));
    const landed = hitOf(event);
    if (landed === undefined) return;
    setHit(landed);
    setFlashing(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlashing(false), HIT_FLASH_MS);
  };
  return (
    <LabCase
      className={LAB_CARD_CLASS}
      title="Pointer pad"
      caption="Click, right-click, middle-click or tap the pad: a marker shows where. Each event is logged with its pointer type and id, b (button), bs (buttons held) and d (click count)."
      expected="A right click logs pointerdown, contextmenu, pointerup and auxclick, and no click. Three quick clicks count 1, 2 and 3 and send one dblclick. A tap logs pointerenter, pointerdown, pointerup, pointerleave and click, and the hover tint never shows for a finger, because a touch never hovers."
    >
      <View
        testID="pad"
        className="relative h-24 items-center justify-center rounded-lg border-2 border-indigo-300 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200"
        style={flashing ? HIT_FLASH : undefined}
        onPointerDown={record}
        onPointerUp={record}
        onPointerCancel={record}
        onPointerEnter={record}
        onPointerLeave={record}
        onPointerMove={() => setMoves(value => value + 1)}
        onClick={record}
        onDoubleClick={record}
        onAuxClick={record}
        onContextMenu={record}
      >
        <Text testID={PAD_LABEL_ID} className="text-sm text-slate-600">Click, right-click or touch here</Text>
        {hit === undefined ? null : (
          <View
            className="pointer-events-none absolute rounded-full border-2 bg-amber-200"
            style={{ left: hit.x - HIT_MARKER_SIZE / 2, top: hit.y - HIT_MARKER_SIZE / 2, width: HIT_MARKER_SIZE, height: HIT_MARKER_SIZE, borderColor: HIT_COLOUR }}
          />
        )}
      </View>
      <StackedReadout
        label="Last hit" colour={HIT_COLOUR}
        value={hit === undefined ? 'nothing yet' : `${hit.event} by ${hit.by} on ${hit.on}, at ${hit.x}, ${hit.y} in the pad`}
      />
      <View className="gap-0.5">
        <Text className="text-xs text-slate-500">{`Last ${LOG_LINES} events, newest last`}</Text>
        <Text testID="pad-log" className="text-xs text-slate-600">{lines.join('\n')}</Text>
      </View>
      <StackedReadout label="Tally" testID="pad-tally" value={describeTally(counts)} />
      <StackedReadout label="Pointer moves (counted, not logged)" testID="pad-moves" value={`moves ${moves}`} />
    </LabCase>
  );
}

/** The knob and the idle-pointer button share the knob's track: the button asks the track to capture a pointer that is already up. */
function CaptureCases() {
  const track = useRef<UIHandle>(null);
  const [value, setValue] = useState(0);
  const [captured, setCaptured] = useState(false);
  const [moves, setMoves] = useState(0);
  const [captureStatus, setCaptureStatus] = useState('not tried');

  /** The value under `x` (root-local), keeping the thumb inside the track. */
  const update = (x: number) => {
    const rect = track.current?.getRect();
    if (rect === undefined) return;
    const fraction = (x - rect.x - KNOB_THUMB_WIDTH / 2) / (rect.width - KNOB_THUMB_WIDTH);
    setValue(Math.round(Math.min(1, Math.max(0, fraction)) * PERCENT));
  };

  return (
    <>
      <LabCase
        className={LAB_CARD_CLASS}
        title="Capture knob"
        caption="Press the track and drag. The track calls setPointerCapture on pointerdown, so it keeps receiving the pointer's moves and its release wherever the pointer goes, even outside the page or the window. A finger works the same way."
        expected="The value follows the pointer and stops at 0 and 100. Captured is true while the pointer is down and false after the release, wherever it happens. Moves counts the moves the track received while it had the pointer."
      >
        <View
          ref={track}
          testID="knob-track"
          className="h-8 w-full flex-row overflow-hidden rounded-lg bg-slate-200"
          style={{ maxWidth: KNOB_TRACK_MAX_WIDTH }}
          onPointerDown={(event: UIPointerEvent) => {
            // Everything until the pointer goes up comes here, wherever the pointer is.
            event.currentTarget.setPointerCapture(event.pointerId);
            setCaptured(true);
            update(event.x);
          }}
          onPointerMove={(event: UIPointerEvent) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            setMoves(count => count + 1);
            update(event.x);
          }}
          onPointerUp={() => setCaptured(false)}
          onPointerCancel={() => setCaptured(false)}
        >
          {/* The track splits what is left of its width, after the thumb, in the proportion of the value. */}
          <View className="bg-indigo-300" style={{ flexGrow: value, flexBasis: 0 }} />
          <View className="h-8 shrink-0 rounded-lg bg-indigo-600" style={{ width: KNOB_THUMB_WIDTH }} />
          <View style={{ flexGrow: PERCENT - value, flexBasis: 0 }} />
        </View>
        <Readout label="Knob" colour={KNOB_COLOUR} testID="knob-readout" value={`value ${value}, captured ${captured}, moves ${moves}`} />
      </LabCase>

      <LabCase
        className={LAB_CARD_CLASS}
        title="A pointer that is up cannot be captured"
        caption="setPointerCapture only works while the pointer is down. This button's click comes after the release, so its call to capture the pointer for the knob throws, and the message is shown."
        expected="A message that starts setPointerCapture failed: pointer 1 is not active (a touch has another id)."
      >
        {/* The button and its result share a row where there is room: the lab must fit a 600 x 900 window with the pad's log full. */}
        <View className="flex-row flex-wrap items-start gap-x-3 gap-y-2">
          <Button
            testID="capture-bad"
            className={labButton}
            onClick={(event: UIPointerEvent) => {
              // By the time a click arrives the pointer is up: it cannot be captured.
              try {
                track.current?.setPointerCapture(event.pointerId);
                setCaptureStatus('captured');
              } catch (error) {
                setCaptureStatus(error instanceof Error ? error.message : String(error));
              }
            }}
          >
            Capture an idle pointer
          </Button>
          <View className="min-w-0 flex-1">
            <StackedReadout label="Result" testID="capture-status" value={captureStatus} />
          </View>
        </View>
      </LabCase>
    </>
  );
}

/** Phase I2: every pointer event a pointer produces, and pointer capture. */
export function PointerLab() {
  return (
    <View testID="pointer-lab" className="w-full min-h-full bg-slate-50 p-6 gap-3">
      <LabIntro
        title="Pointer events and capture"
        paragraphs={[
          'A mouse and a finger reach a component as pointer events with the DOM\'s names and fields (pointerdown, pointerup, click, dblclick, auxclick, contextmenu, pointercancel). A touch is a touch pointer only: never also a mouse press, and it never hovers.',
        ]}
      />
      <LabGrid>
        <Pad />
        <CaptureCases />
      </LabGrid>
    </View>
  );
}
